import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { REPO, type PackedPackage } from "./pack-engine.mts";
import { fieldOf } from "./export-source.mts";

export interface Ran {
	readonly ok: boolean;
	readonly said: string;
}

const PEERS_FROM_THE_REPO = ["react", "react-dom", "zod"];

export function ran(cwd: string, command: string, args: readonly string[]): Ran {
	try {
		const said = execFileSync(command, args, { cwd, encoding: "utf8", stdio: "pipe" });
		return { ok: true, said };
	} catch (failure) {
		return {
			ok: false,
			said: `${String(fieldOf(failure, "stdout") ?? "")}${String(fieldOf(failure, "stderr") ?? failure)}`,
		};
	}
}

export function installOfflineFirst(project: string): void {
	const offline = ran(project, "npm", ["install", "--no-audit", "--no-fund", "--offline"]);
	if (offline.ok) {
		console.log(`installed offline into ${project}`);
		return;
	}
	console.log(
		`offline install refused: ${offline.said.split("\n").find((line) => line.includes("ERR")) ?? offline.said}`,
	);
	const online = ran(project, "npm", ["install", "--no-audit", "--no-fund"]);
	if (!online.ok) throw new Error(`npm install failed in ${project}:\n${online.said}`);
	console.log(`installed online into ${project}`);
}

export function runnerWithTheCli(packed: readonly PackedPackage[], scratch: string): string {
	const runner = path.join(scratch, "runner");
	fs.mkdirSync(runner);
	const engine = packed.map(({ name, tarball }) => [name, `file:${tarball}`]);
	const peers = PEERS_FROM_THE_REPO.map((name) => [name, versionInRepo(name)]);
	const manifest = { name: "create-runner", private: true, dependencies: Object.fromEntries([...engine, ...peers]) };
	fs.writeFileSync(path.join(runner, "package.json"), JSON.stringify(manifest, null, "\t"));
	installOfflineFirst(runner);
	return runner;
}

export function md5Of(at: string): string {
	return crypto.createHash("md5").update(fs.readFileSync(at)).digest("hex");
}

function versionInRepo(name: string): string {
	const manifest: unknown = JSON.parse(fs.readFileSync(path.join(REPO, "node_modules", name, "package.json"), "utf8"));
	return String(fieldOf(manifest, "version"));
}
