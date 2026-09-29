import type { HostConsole } from "../gateway/host.js";

type CommandOutcome = Awaited<ReturnType<HostConsole["run"]>>;

type RequireModule = (name: string) => unknown;

interface CommandRunner {
	exec(
		command: string,
		options: { cwd?: string | undefined },
		done: (failure: Error | null, stdout: string, stderr: string) => void,
	): void;
}

const NO_COMMAND_LINE = "no command line in this build";
const DESKTOP_HOST = "obsidian-desktop";

export function createConsole(
	type: string,
	requireModule: RequireModule | undefined,
	workingDirectory: string | undefined,
): HostConsole {
	const requireOnDesktop = type === DESKTOP_HOST ? requireModule : undefined;
	return {
		can: { log: true, run: Boolean(requireOnDesktop) },
		log(...parts) {
			console.log("[widgetarium]", ...parts);
			return true;
		},
		run: runOrRefuse(requireOnDesktop, workingDirectory),
	};
}

export function refusingConsole(why: string): HostConsole {
	return {
		can: { log: false, run: false },
		log: () => false,
		run: async () => refusedOutcome(why),
	};
}

// TRADE-OFF: one result shape whether it ran or not, so a caller reading only `output` never meets a throw
function runOrRefuse(requireOnDesktop: RequireModule | undefined, cwd: string | undefined): HostConsole["run"] {
	return async (command) => {
		if (!requireOnDesktop) return refusedOutcome(NO_COMMAND_LINE);
		const runner = commandRunnerIn(requireOnDesktop);
		if (!runner) return refusedOutcome(NO_COMMAND_LINE);
		return runCommand(runner, String(command ?? ""), cwd);
	};
}

function runCommand(runner: CommandRunner, command: string, cwd: string | undefined): Promise<CommandOutcome> {
	return new Promise((resolve) => {
		runner.exec(command, { cwd }, (failure, stdout, stderr) =>
			resolve({ ok: !failure, output: `${stdout}${stderr}`, failure: failure ? failure.message : null }),
		);
	});
}

function refusedOutcome(failure: string): CommandOutcome {
	return { ok: false, output: "", failure };
}

function commandRunnerIn(requireModule: RequireModule): CommandRunner | null {
	const child = requireModule("child_process");
	return isCommandRunner(child) ? child : null;
}

function isCommandRunner(value: unknown): value is CommandRunner {
	return typeof value === "object" && value !== null && "exec" in value && typeof value.exec === "function";
}
