import { parseCheckArgs, parseCreateArgs } from "./cli-args.js";
import { CLI_HELP, HELP_WORDS, RESERVED_COMMANDS } from "./cli-help.js";
import { CliRefusal, type CliOutput } from "./cli-output.js";
import { runCheck } from "./check-command.js";
import { runCreate } from "./create-command.js";

export async function runCli(argv: readonly string[], output: CliOutput): Promise<number> {
	const [command, ...rest] = argv;
	try {
		return await runCommand(command, rest, output);
	} catch (error) {
		if (!(error instanceof CliRefusal)) throw error;
		output.err(error.message);
		return 1;
	}
}

async function runCommand(command: string | undefined, rest: readonly string[], output: CliOutput): Promise<number> {
	if (command === "create") return runCreate(parseCreateArgs(rest), output);
	if (command === "check") return runCheck(parseCheckArgs(rest), output);
	if (command === undefined || HELP_WORDS.includes(command)) {
		output.out(CLI_HELP);
		return 0;
	}
	if (RESERVED_COMMANDS.includes(command)) throw new CliRefusal(`widgetarium ${command} is coming in S8`);
	throw new CliRefusal(`unknown command "${command}"\n\n${CLI_HELP}`);
}
