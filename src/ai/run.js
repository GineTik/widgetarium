import { HTTP } from "./providers.js";
import { expandArgs } from "./command.js";
import { environmentFor } from "./path.js";
import { createLineSplitter, plainText, readerNamed } from "./stream.js";

const IDLE_MS = 180000;
const HARD_STOP_MS = 5000;

const NO_COMMAND = "This provider has no command to run. Open the provider settings and name one.";
const NO_ENDPOINT = "This provider has no endpoint to call. Open the provider settings and name one.";
const NOT_ON_THIS_MACHINE = "{command} is not installed on this machine, or is not on the plugin's PATH.";
const ENDED_BADLY = "{command} exited with code {code}. {said}";
const NO_PROCESSES = "This build of Obsidian cannot start a process, so only an endpoint provider can be used here.";
const NO_ANSWER = "{endpoint} answered {status}. {said}";
const UNREACHABLE = "{endpoint} could not be reached. If this is Ollama, start it with: ollama serve";
const ASKING_IN_A_TERMINAL =
	"{command} is waiting for an answer it can only be given in a terminal — it is most likely not signed in. Run it once in your own terminal, then come back.";
const WENT_QUIET = "{command} produced nothing for {minutes} minutes, so it was stopped.";

// TRADE-OFF: only the providers that print raw text are sniffed; a JSON stream can carry these letters as content
const ASKS_IN_A_TERMINAL = /\[[YyNn]\/[YyNn]\]|\((?:y\/n|Y\/n|y\/N)\)/;

function failureOf(said) {
	return { failure: said };
}

// TRADE-OFF: a pid of 0 would signal this process's own group, so a child without a real pid is killed alone
function killTree(child, killGroup) {
	const group = Number(child?.pid) > 0 ? -child.pid : null;
	const send = (signal) => {
		if (group === null || !killGroup) return child.kill?.(signal);
		try {
			killGroup(group, signal);
		} catch {
			child.kill?.(signal);
		}
	};
	send("SIGTERM");
	const hardStop = setTimeout(() => send("SIGKILL"), HARD_STOP_MS);
	hardStop?.unref?.();
}

function refusalBeforeStarting(spawn, provider) {
	if (!spawn) return NO_PROCESSES;
	if (String(provider.command ?? "").trim() === "") return NO_COMMAND;
	return null;
}

// TRADE-OFF: a parser that throws is swallowed per line; a throw inside a stdout listener leaves the run unsettled and the panel spinning forever
function eventsInto(provider, emit, rememberFailure) {
	const read = readerNamed(provider.outputFormat);
	return createLineSplitter((line) => {
		try {
			read(line, (event) => {
				if (event.failure) rememberFailure(event.failure);
				emit(event);
			});
		} catch (failure) {
			console.error("[widgetarium] a line of the agent's output could not be read", line, failure);
		}
	});
}

function isAskingInATerminal(provider, chunk) {
	return provider.outputFormat === "text" && ASKS_IN_A_TERMINAL.test(plainText(chunk));
}

// TRADE-OFF: the stream's own reason wins over the exit code, because a CLI reports a refusal on stdout and leaves stderr empty
function exitAnswer({ code, streamFailure, stderr, withCommandName }) {
	if (code === 0 || code === null) return { failure: null };
	if (streamFailure) return failureOf(streamFailure);
	return failureOf(
		withCommandName(ENDED_BADLY).replace("{code}", String(code)).replace("{said}", stderr.join("").trim()),
	);
}

function startFailure(failure, withCommandName) {
	return failureOf(
		failure?.code === "ENOENT" ? withCommandName(NOT_ON_THIS_MACHINE) : String(failure?.message ?? failure),
	);
}

function createQuietWatch(onQuiet) {
	let timer = null;
	return {
		heard() {
			clearTimeout(timer);
			timer = setTimeout(onQuiet, IDLE_MS);
			timer?.unref?.();
		},
		off: () => clearTimeout(timer),
	};
}

function cliRun({ spawn, killGroup, vaultPath, pluginPath, env = {} }, provider, ask, emit) {
	const refusal = refusalBeforeStarting(spawn, provider);
	if (refusal) return { stop: () => {}, done: Promise.resolve(failureOf(refusal)) };

	const argv = expandArgs(provider, { ...ask, vaultPath, pluginPath });
	const withCommandName = (said) => said.replace("{command}", provider.command);
	const wentQuiet = withCommandName(WENT_QUIET).replace("{minutes}", String(Math.round(IDLE_MS / 60000)));
	const stderr = [];
	let child = null;
	let stopping = false;
	let streamFailure = null;

	const done = new Promise((settle) => {
		let quiet = null;
		const finish = (answer) => {
			quiet?.off();
			settle(answer);
		};
		const giveUp = (said) => {
			stopping = true;
			finish(failureOf(said));
			if (child) killTree(child, killGroup);
		};
		quiet = createQuietWatch(() => giveUp(wentQuiet));

		try {
			child = spawn(provider.command, argv, { cwd: vaultPath || undefined, env: environmentFor(env), detached: true });
		} catch (failure) {
			return finish(startFailure(failure, withCommandName));
		}

		const out = eventsInto(provider, emit, (failure) => {
			streamFailure = failure;
		});

		child.stdout?.setEncoding?.("utf8");
		child.stderr?.setEncoding?.("utf8");
		child.stdout?.on("data", (chunk) => {
			const said = String(chunk);
			quiet.heard();
			if (isAskingInATerminal(provider, said)) return giveUp(withCommandName(ASKING_IN_A_TERMINAL));
			out.push(said);
		});
		child.stderr?.on("data", (chunk) => {
			quiet.heard();
			stderr.push(plainText(String(chunk)));
		});
		child.stdin?.end?.();
		quiet.heard();

		child.on("error", (failure) => finish(startFailure(failure, withCommandName)));
		child.on("close", (code) => {
			out.end();
			if (!stopping) finish(exitAnswer({ code, streamFailure, stderr, withCommandName }));
		});
	});

	return {
		stop: () => {
			stopping = true;
			if (child) killTree(child, killGroup);
		},
		done,
	};
}

function chatMessages(ask) {
	const said = ask.history.map((turn) => ({ role: turn.role, content: turn.text }));
	return [{ role: "system", content: ask.brief }, ...said, { role: "user", content: ask.prompt }];
}

const isWebAddress = (endpoint) => /^https?:\/\//.test(String(endpoint ?? "").trim());

async function answerFrom(fetchStream, endpoint, body, signal) {
	let answer;
	try {
		answer = await fetchStream(endpoint, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body,
			signal,
		});
	} catch {
		return { answer: null, failure: UNREACHABLE.replace("{endpoint}", endpoint) };
	}
	if (answer.ok) return { answer, failure: null };
	const said = await answer.text().catch(() => "");
	return {
		answer: null,
		failure: NO_ANSWER.replace("{endpoint}", endpoint)
			.replace("{status}", String(answer.status))
			.replace("{said}", said.trim()),
	};
}

async function drain(stream, onLine) {
	const out = createLineSplitter(onLine);
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	for (;;) {
		const step = await reader.read();
		if (step.done) break;
		out.push(decoder.decode(step.value, { stream: true }));
	}
	out.end();
}

function httpRun({ fetchStream }, provider, ask, emit) {
	if (!isWebAddress(provider.endpoint)) return { stop: () => {}, done: Promise.resolve(failureOf(NO_ENDPOINT)) };

	const read = readerNamed(provider.outputFormat);
	const stopper = new AbortController();
	const body = JSON.stringify({ model: provider.model, messages: chatMessages(ask), stream: true });

	const done = (async () => {
		const asked = await answerFrom(fetchStream, provider.endpoint, body, stopper.signal);
		if (asked.failure !== null) return stopper.signal.aborted ? { failure: null } : failureOf(asked.failure);
		try {
			await drain(asked.answer.body, (line) => read(line, emit));
			return { failure: null };
		} catch (failure) {
			if (stopper.signal.aborted) return { failure: null };
			return failureOf(String(failure?.message ?? failure));
		}
	})();

	return { stop: () => stopper.abort(), done };
}

export function createRunner(doors) {
	return {
		run(provider, ask, emit) {
			return provider.kind === HTTP ? httpRun(doors, provider, ask, emit) : cliRun(doors, provider, ask, emit);
		},
	};
}
