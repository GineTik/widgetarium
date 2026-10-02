import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import type { RepositoryFields } from "./schemas.js";

export type GitRun = (args: readonly string[]) => Promise<string>;

const GIT_FAILED = "git {command} failed: {why}";
const NO_REPOSITORY = "no repository: pick its folder in the settings window";

export function gitIn(ports: ImplementationPorts, fields: RepositoryFields): GitRun {
	const cwd = fields.repository?.trim() || ports.workingDirectory;
	return async (args) => {
		if (!cwd) throw new Error(NO_REPOSITORY);
		const outcome = await ports.commandLine.run("git", args, cwd);
		if (outcome.ok) return outcome.output;
		const why = outcome.output.trim() || outcome.failure || "no output";
		throw new Error(GIT_FAILED.replace("{command}", args[0] ?? "").replace("{why}", why));
	};
}
