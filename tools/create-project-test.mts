import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PACKED_INTO, packEngine } from "./pack-engine.mts";
import { fieldOf } from "./export-source.mts";
import { installOfflineFirst, md5Of, ran, runnerWithTheCli } from "./packed-project.mts";

const APP = "shop";
const KIT_ALIAS = "@widgetarium/kit";
const ALIAS_PROBE = "src/shared/kit/alias-probe.ts";
const KIT_CONSUMER = "src/widgets/greeting/widget.tsx";
const KIT_CONSUMER_SOURCE = `import { createWidget, defineLayout, defineMetadata } from "widgetarium";
import { Card } from "widgetarium/kit";

const Greeting = createWidget({ draw: () => <Card>Hello</Card> });

export const metadata = defineMetadata(Greeting, { title: "Greeting", description: "Who is greeted?", keywords: ["greeting"] });

export const layout = defineLayout({ role: "text", size: { preferredWidth: 240, preferredHeight: "auto" } });

export default Greeting;
`;

let failures = 0;

function check(name: string, held: unknown, wanted: unknown): void {
	const same = held === wanted;
	if (!same) failures += 1;
	console.log(`${same ? "ok  " : "not ok"} ${name}${same ? "" : `\n      held ${String(held)}`}`);
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
	fs.mkdirSync(path.dirname(path.join(app, KIT_CONSUMER)), { recursive: true });
	fs.writeFileSync(path.join(app, KIT_CONSUMER), KIT_CONSUMER_SOURCE);
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
		check(
			"and vite build is red on a kit name the probe lacks",
			!brokenBuild.ok && brokenBuild.said.includes(`is not exported by "${ALIAS_PROBE}"`),
			true,
		);
	});
	const restored = ran(app, "npm", ["run", "typecheck"]);
	check("restored, typecheck is clean again", restored.ok ? "" : restored.said, "");
} finally {
	fs.rmSync(scratch, { recursive: true, force: true });
}

console.log(failures === 0 ? "create project: every check passed" : `create project: ${failures} checks red`);
process.exit(failures === 0 ? 0 : 1);
