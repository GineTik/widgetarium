#!/usr/bin/env node
import { consoleOutput } from "./cli-output.js";
import { runCli } from "./run-cli.js";

void runCli(process.argv.slice(2), consoleOutput).then((code) => {
	process.exitCode = code;
});
