import { runAdd } from "./add-command.js";
import { runCatalogue } from "./catalogue-command.js";
import { parseAddArgs, parseCatalogueArgs, parseCheckArgs, parseCreateArgs } from "./cli-args.js";
import { CLI_HELP, HELP_WORDS } from "./cli-help.js";
import { CliRefusal, type CliOutput } from "./cli-output.js";
import { runCheck } from "./check-command.js";
import { runCreate } from "./create-command.js";

export async function runCli(argv: readonly string[], output: CliOutput, cwd: string = process.cwd()): Promise<number> {
	const [command, ...rest] = argv;
	try {
		return await runCommand(command, rest, { output, cwd });
	} catch (error) {
		if (!(error instanceof CliRefusal)) throw error;
		output.err(error.message);
		return 1;
	}
}

interface CommandContext {
	readonly output: CliOutput;
	readonly cwd: string;
}

async function runCommand(
	command: string | undefined,
	rest: readonly string[],
	{ output, cwd }: CommandContext,
): Promise<number> {
	if (command === "create") return runCreate(parseCreateArgs(rest), output);
	if (command === "check") return runCheck(parseCheckArgs(rest), output);
	if (command === "catalogue") return runCatalogue(parseCatalogueArgs(rest), output, cwd);
	if (command === "add") return runAdd(parseAddArgs(rest), output, cwd);
	if (command === undefined || HELP_WORDS.includes(command)) {
		output.out(CLI_HELP);
		return 0;
	}
	throw new CliRefusal(`unknown command "${command}"\n\n${CLI_HELP}`);
}
