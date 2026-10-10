import { execFileSync } from "node:child_process";
import { CliRefusal } from "./cli-output.js";

export function runIn(cwd: string, command: string, args: readonly string[]): void {
	try {
		execFileSync(command, args, { cwd, stdio: "inherit" });
	} catch (error) {
		throw failureOf(cwd, command, args, error);
	}
}

export function outputOf(cwd: string, command: string, args: readonly string[]): string {
	try {
		return execFileSync(command, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
	} catch (error) {
		throw failureOf(cwd, command, args, error);
	}
}

function failureOf(cwd: string, command: string, args: readonly string[], error: unknown): CliRefusal {
	const said = error instanceof Error ? error.message : String(error);
	return new CliRefusal(`${command} ${args.join(" ")} failed in ${cwd}: ${said}`);
}
