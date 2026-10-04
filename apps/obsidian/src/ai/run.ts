import { isObject } from "@widgetarium/core/engine/is-object.js";
import { HTTP } from "./providers.js";
import type { Provider } from "./providers.js";
import { expandArgs } from "./command.js";
import { environmentFor } from "./path.js";
import type { Environment } from "./path.js";
import { createLineSplitter, plainText, readerNamed } from "./stream.js";
import type { Emit, LineSplitter } from "./stream.js";

export interface ChatTurn {
	readonly role: string;
	readonly text: string;
}

export interface RunAsk {
	readonly prompt: string;
	readonly brief: string;
	readonly history: readonly ChatTurn[];
	readonly session?: string | null;
	readonly skipPermissions?: boolean;
	readonly helpers?: string | null;
}

export interface RunAnswer {
	readonly failure: string | null;
}

export interface Run {
	stop(): void;
	readonly done: Promise<RunAnswer>;
}

interface OutputPipe {
	setEncoding?(encoding: "utf8"): unknown;
	on(event: "data", listener: (chunk: unknown) => void): unknown;
}

export interface RunningChild {
	readonly pid?: number | undefined;
	readonly stdout?: OutputPipe | null;
	readonly stderr?: OutputPipe | null;
	readonly stdin?: { end?(): unknown } | null;
	kill?(signal: "SIGTERM" | "SIGKILL"): unknown;
	on(event: "error", listener: (failure: unknown) => void): unknown;
	on(event: "close", listener: (code: number | null) => void): unknown;
}

export interface SpawnAsk {
	readonly cwd: string | undefined;
	readonly env: Record<string, string | undefined>;
	readonly detached: boolean;
}

export type Spawn = (command: string, args: readonly string[], options: SpawnAsk) => RunningChild;

export type KillGroup = (group: number, signal: "SIGTERM" | "SIGKILL") => void;

export type FetchStream = (url: string, init: RequestInit) => Promise<Response>;

export interface RunnerDoors {
	readonly spawn?: Spawn | null;
	readonly killGroup?: KillGroup | null;
	readonly fetchStream?: FetchStream;
	readonly vaultPath: string;
	readonly pluginPath: string;
	readonly env?: Environment;
}

export interface Runner {
	run(provider: Provider, ask: RunAsk, emit: Emit): Run;
}

type Answered =
	{ readonly answer: Response; readonly failure: null } | { readonly answer: null; readonly failure: string };

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
const NO_BODY = "the endpoint answered with no body to read";

// TRADE-OFF: only the providers that print raw text are sniffed; a JSON stream can carry these letters as content
const ASKS_IN_A_TERMINAL = /\[[YyNn]\/[YyNn]\]|\((?:y\/n|Y\/n|y\/N)\)/;

export function createRunner(doors: RunnerDoors): Runner {
	return {
		run(provider, ask, emit) {
			return provider.kind === HTTP ? httpRun(doors, provider, ask, emit) : cliRun(doors, provider, ask, emit);
		},
	};
}

function failureOf(said: string): RunAnswer {
	return { failure: said };
}

function messageOf(failure: unknown): string {
	const message = isObject(failure) ? failure["message"] : undefined;
	return String(message ?? failure);
}

// TRADE-OFF: a pid of 0 would signal this process's own group, so a child without a real pid is killed alone
function killTree(child: RunningChild, killGroup: KillGroup | null | undefined): void {
	const group = Number(child.pid) > 0 ? -Number(child.pid) : null;
	const send = (signal: "SIGTERM" | "SIGKILL"): void => {
		if (group === null || !killGroup) {
			child.kill?.(signal);
			return;
		}
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

function refusalBeforeStarting(spawn: Spawn | null | undefined, provider: Provider): string | null {
	if (!spawn) return NO_PROCESSES;
	if (String(provider.command ?? "").trim() === "") return NO_COMMAND;
	return null;
}

// TRADE-OFF: a parser that throws is swallowed per line; a throw inside a stdout listener leaves the run unsettled and the panel spinning forever
function eventsInto(provider: Provider, emit: Emit, rememberFailure: (failure: string) => void): LineSplitter {
	const read = readerNamed(provider.outputFormat);
	return createLineSplitter((line) => {
		try {
			read(line, (event) => {
				if ("failure" in event && event.failure) rememberFailure(event.failure);
				emit(event);
			});
		} catch (failure) {
			console.error("[widgetarium] a line of the agent's output could not be read", line, failure);
		}
	});
}

function isAskingInATerminal(provider: Provider, chunk: string): boolean {
	return provider.outputFormat === "text" && ASKS_IN_A_TERMINAL.test(plainText(chunk));
}

interface ExitAsk {
	readonly code: number | null;
	readonly streamFailure: string | null;
	readonly stderr: readonly string[];
	readonly withCommandName: (said: string) => string;
}

// TRADE-OFF: the stream's own reason wins over the exit code, because a CLI reports a refusal on stdout and leaves stderr empty
function exitAnswer({ code, streamFailure, stderr, withCommandName }: ExitAsk): RunAnswer {
	if (code === 0 || code === null) return { failure: null };
	if (streamFailure) return failureOf(streamFailure);
	return failureOf(
		withCommandName(ENDED_BADLY).replace("{code}", String(code)).replace("{said}", stderr.join("").trim()),
	);
}

function startFailure(failure: unknown, withCommandName: (said: string) => string): RunAnswer {
	const code = isObject(failure) ? failure["code"] : undefined;
	return failureOf(code === "ENOENT" ? withCommandName(NOT_ON_THIS_MACHINE) : messageOf(failure));
}

interface QuietWatch {
	heard(): void;
	off(): void;
}

function createQuietWatch(onQuiet: () => void): QuietWatch {
	let timer: ReturnType<typeof setTimeout> | undefined;
	return {
		heard() {
			clearTimeout(timer);
			timer = setTimeout(onQuiet, IDLE_MS);
			timer?.unref?.();
		},
		off: () => clearTimeout(timer),
	};
}

interface CliRunState {
	child: RunningChild | null;
	stopping: boolean;
	streamFailure: string | null;
}

function cliRun(doors: RunnerDoors, provider: Provider, ask: RunAsk, emit: Emit): Run {
	const { spawn, killGroup } = doors;
	const refusal = refusalBeforeStarting(spawn, provider);
	if (refusal || !spawn) return { stop: () => {}, done: Promise.resolve(failureOf(refusal ?? NO_PROCESSES)) };

	const state: CliRunState = { child: null, stopping: false, streamFailure: null };
	const done = new Promise<RunAnswer>((settle) => {
		startChild({ doors: { ...doors, spawn }, provider, ask, emit, state, settle });
	});

	return {
		stop: () => {
			state.stopping = true;
			if (state.child) killTree(state.child, killGroup);
		},
		done,
	};
}

interface ChildStart {
	readonly doors: RunnerDoors & { readonly spawn: Spawn };
	readonly provider: Provider;
	readonly ask: RunAsk;
	readonly emit: Emit;
	readonly state: CliRunState;
	readonly settle: (answer: RunAnswer) => void;
}

function startChild({ doors, provider, ask, emit, state, settle }: ChildStart): void {
	const { spawn, killGroup, vaultPath, pluginPath, env = {} } = doors;
	const argv = expandArgs(provider, { ...ask, vaultPath, pluginPath });
	const withCommandName = (said: string): string => said.replace("{command}", provider.command);
	const wentQuiet = withCommandName(WENT_QUIET).replace("{minutes}", String(Math.round(IDLE_MS / 60000)));
	const stderr: string[] = [];

	const finish = (answer: RunAnswer): void => {
		quiet.off();
		settle(answer);
	};
	const giveUp = (said: string): void => {
		state.stopping = true;
		finish(failureOf(said));
		if (state.child) killTree(state.child, killGroup);
	};
	const quiet = createQuietWatch(() => giveUp(wentQuiet));

	let child: RunningChild;
	try {
		child = spawn(provider.command, argv, { cwd: vaultPath || undefined, env: environmentFor(env), detached: true });
	} catch (failure) {
		finish(startFailure(failure, withCommandName));
		return;
	}
	state.child = child;

	const out = eventsInto(provider, emit, (failure) => {
		state.streamFailure = failure;
	});

	child.stdout?.setEncoding?.("utf8");
	child.stderr?.setEncoding?.("utf8");
	child.stdout?.on("data", (chunk) => {
		const said = String(chunk);
		quiet.heard();
		if (isAskingInATerminal(provider, said)) {
			giveUp(withCommandName(ASKING_IN_A_TERMINAL));
			return;
		}
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
		if (!state.stopping) finish(exitAnswer({ code, streamFailure: state.streamFailure, stderr, withCommandName }));
	});
}

function chatMessages(ask: RunAsk): { role: string; content: string }[] {
	const said = ask.history.map((turn) => ({ role: turn.role, content: turn.text }));
	return [{ role: "system", content: ask.brief }, ...said, { role: "user", content: ask.prompt }];
}

const isWebAddress = (endpoint: unknown): boolean => /^https?:\/\//.test(String(endpoint ?? "").trim());

async function answerFrom(
	fetchStream: FetchStream | undefined,
	endpoint: string,
	body: string,
	signal: AbortSignal,
): Promise<Answered> {
	let answer: Response;
	try {
		if (!fetchStream) throw new TypeError("there is nothing to fetch with");
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

async function drain(stream: ReadableStream<Uint8Array> | null, onLine: (line: string) => void): Promise<void> {
	if (!stream) throw new TypeError(NO_BODY);
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

function httpRun({ fetchStream }: RunnerDoors, provider: Provider, ask: RunAsk, emit: Emit): Run {
	if (!isWebAddress(provider.endpoint)) return { stop: () => {}, done: Promise.resolve(failureOf(NO_ENDPOINT)) };

	const read = readerNamed(provider.outputFormat);
	const stopper = new AbortController();
	const body = JSON.stringify({ model: provider.model, messages: chatMessages(ask), stream: true });

	const done = (async (): Promise<RunAnswer> => {
		const asked = await answerFrom(fetchStream, provider.endpoint, body, stopper.signal);
		if (asked.answer === null) return stopper.signal.aborted ? { failure: null } : failureOf(asked.failure);
		try {
			await drain(asked.answer.body, (line) => read(line, emit));
			return { failure: null };
		} catch (failure) {
			if (stopper.signal.aborted) return { failure: null };
			return failureOf(messageOf(failure));
		}
	})();

	return { stop: () => stopper.abort(), done };
}
