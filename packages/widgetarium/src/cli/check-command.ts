import * as fileSystem from "node:fs/promises";
import path from "node:path";
import { checkProject, formatFindings, nodeProjectFiles } from "@widgetarium/core/project/index.js";
import type { CheckArgs } from "./cli-args.js";
import type { CliOutput } from "./cli-output.js";

export async function runCheck({ dir }: CheckArgs, output: CliOutput): Promise<number> {
	const root = path.resolve(dir);
	const findings = await checkProject(nodeProjectFiles(root, fileSystem));
	if (findings.length === 0) {
		output.out(`${root}: no findings`);
		return 0;
	}
	output.err(formatFindings(findings));
	output.err(`${root}: ${findings.length} finding(s)`);
	return 1;
}
