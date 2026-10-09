import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PACKED_INTO, REPO, packEngine, type PackedPackage } from "./pack-engine.mts";
import { fieldOf } from "./export-source.mts";

interface Ran {
	readonly ok: boolean;
	readonly said: string;
}

const PEERS_FROM_THE_REPO = ["react", "react-dom", "zod"];
const APP = "shop";
const KIT_ALIAS = "@widgetarium/kit";
const ALIAS_PROBE = "src/shared/kit/alias-probe.ts";

let failures = 0;

function check(name: string, held: unknown, wanted: unknown): void {
	const same = held === wanted;
	if (!same) failures += 1;
	console.log(`${same ? "ok  " : "not ok"} ${name}${same ? "" : `\n      held ${String(held)}`}`);
}

function ran(cwd: string, command: string, args: readonly string[]): Ran {
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

function versionInRepo(name: string): string {
	const manifest: unknown = JSON.parse(fs.readFileSync(path.join(REPO, "node_modules", name, "package.json"), "utf8"));
	return String(fieldOf(manifest, "version"));
}

function installOfflineFirst(project: string): void {
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

function runnerWithTheCli(packed: readonly PackedPackage[], scratch: string): string {
	const runner = path.join(scratch, "runner");
	fs.mkdirSync(runner);
	const engine = packed.map(({ name, tarball }) => [name, `file:${tarball}`]);
	const peers = PEERS_FROM_THE_REPO.map((name) => [name, versionInRepo(name)]);
	const manifest = { name: "create-runner", private: true, dependencies: Object.fromEntries([...engine, ...peers]) };
	fs.writeFileSync(path.join(runner, "package.json"), JSON.stringify(manifest, null, "\t"));
	installOfflineFirst(runner);
	return runner;
}

function md5Of(at: string): string {
	return crypto.createHash("md5").update(fs.readFileSync(at)).digest("hex");
}

function withKitAliasPointedAtProbe<T>(app: string, run: () => T): T {
	const files = ["tsconfig.json", "widgetarium.json"].map((name) => path.join(app, name));
	const kept = files.map((at) => ({ at, text: fs.readFileSync(at, "utf8"), md5: md5Of(at) }));
	fs.writeFileSync(path.join(app, ALIAS_PROBE), "export const probe = 1;\n");
	for (const { at, text } of kept) fs.writeFileSync(at, retargeted(at, text));
	try {
		return run();
	} finally {
		for (const { at, text } of kept) fs.writeFileSync(at, text);
		fs.rmSync(path.join(app, ALIAS_PROBE));
		check(
			"and both files are restored byte for byte",
			kept.every(({ at, md5 }) => md5Of(at) === md5),
			true,
		);
	}
}

function retargeted(at: string, text: string): string {
	const json: unknown = JSON.parse(text);
	const isTsconfig = path.basename(at) === "tsconfig.json";
	const holder = isTsconfig ? fieldOf(fieldOf(json, "compilerOptions"), "paths") : fieldOf(json, "aliases");
	if (typeof holder !== "object" || holder === null || !(KIT_ALIAS in holder))
		throw new Error(`${at} maps no ${KIT_ALIAS}`);
	Reflect.set(holder, KIT_ALIAS, isTsconfig ? [`./${ALIAS_PROBE}`] : ALIAS_PROBE);
	return JSON.stringify(json);
}

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "wg-create-project-"));
try {
	const packed = await packEngine();
	const runner = runnerWithTheCli(packed, scratch);
	const app = path.join(scratch, APP);
	const created = ran(scratch, path.join(runner, "node_modules/.bin/widgetarium"), [
		"create",
		app,
		"--engine",
		PACKED_INTO,
		"--no-git",
		"--no-install",
	]);
	check("the packed CLI creates the app", created.ok, true);
	if (!created.ok) throw new Error(created.said);
	installOfflineFirst(app);

	const typecheck = ran(app, "npm", ["run", "typecheck"]);
	check("npm run typecheck is clean", typecheck.ok ? "" : typecheck.said, "");
	const projectCheck = ran(app, "npm", ["run", "check"]);
	check("npm run check finds nothing", projectCheck.ok ? "" : projectCheck.said, "");
	const build = ran(app, "npm", ["run", "build"]);
	check("npm run build succeeds", build.ok ? "" : build.said, "");
	check("and dist/index.html exists", fs.existsSync(path.join(app, "dist/index.html")), true);

	withKitAliasPointedAtProbe(app, () => {
		const broken = ran(app, "npm", ["run", "typecheck"]);
		check("with the kit alias pointed elsewhere typecheck is red on Card", broken.said.includes("Card"), true);
		const brokenBuild = ran(app, path.join(app, "node_modules/.bin/vite"), ["build"]);
		check("and vite build is red on Card too", !brokenBuild.ok && brokenBuild.said.includes("Card"), true);
	});
	const restored = ran(app, "npm", ["run", "typecheck"]);
	check("restored, typecheck is clean again", restored.ok ? "" : restored.said, "");
} finally {
	fs.rmSync(scratch, { recursive: true, force: true });
}

console.log(failures === 0 ? "create project: every check passed" : `create project: ${failures} checks red`);
process.exit(failures === 0 ? 0 : 1);
