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
const BUNDLED_ICON = "src/app-icon.svg";
const RENAMED_APP = 'Farm & "Field"';
const ICON_LINK = '<link rel="icon" type="image/svg+xml" href="/icon.svg">';
const KIT_CONSUMER_SOURCE = `import { createWidget, defineLayout, defineMetadata } from "@widgetarium/core";
import { Card } from "@widgetarium/kit";

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

function headOf(app: string): string {
	const html = fs.readFileSync(path.join(app, "dist/index.html"), "utf8");
	return html.slice(0, html.indexOf("</head>"));
}

function namesApp(head: string, name: string): boolean {
	const text = name.replaceAll("&", "&amp;");
	const attribute = text.replaceAll('"', "&quot;");
	return (
		head.includes(`<title>${text}</title>`) && head.includes(`<meta name="application-name" content="${attribute}">`)
	);
}

function builtScriptsHold(app: string, text: string): boolean {
	const assets = path.join(app, "dist/assets");
	return fs
		.readdirSync(assets)
		.filter((name) => name.endsWith(".js"))
		.some((name) => fs.readFileSync(path.join(assets, name), "utf8").includes(text));
}

function withApp<T>(app: string, fields: Readonly<Record<string, string>>, run: () => T): T {
	const at = path.join(app, "widgetarium.json");
	const kept = { text: fs.readFileSync(at, "utf8"), md5: md5Of(at) };
	const json: unknown = JSON.parse(kept.text);
	Object.assign(Object(fieldOf(json, "app")), fields);
	fs.writeFileSync(at, JSON.stringify(json));
	try {
		return run();
	} finally {
		fs.writeFileSync(at, kept.text);
		check("and widgetarium.json is restored byte for byte", md5Of(at), kept.md5);
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
	const head = headOf(app);
	check("the built head names the app from widgetarium.json", namesApp(head, APP), true);
	check("and links the icon widgetarium.json names", head.includes(ICON_LINK), true);
	check("and the icon is built beside it", fs.existsSync(path.join(app, "dist/icon.svg")), true);
	withApp(app, { name: RENAMED_APP }, () => {
		const renamed = ran(app, path.join(app, "node_modules/.bin/vite"), ["build"]);
		check(
			"falsified: renamed in widgetarium.json, the head no longer names the old app",
			[renamed.ok, namesApp(headOf(app), APP)].join(),
			"true,false",
		);
		check("and names the new one, escaped", namesApp(headOf(app), RENAMED_APP), true);
	});
	fs.copyFileSync(path.join(app, "public/icon.svg"), path.join(app, BUNDLED_ICON));
	withApp(app, { icon: BUNDLED_ICON }, () => {
		const bundled = ran(app, path.join(app, "node_modules/.bin/vite"), ["build"]);
		const href = /<link rel="icon" type="image\/svg\+xml" href="(\/assets\/[^"]+\.svg)">/.exec(headOf(app))?.[1];
		check("an icon outside public/ is linked as a built asset", [bundled.ok, href !== undefined].join(), "true,true");
		check("and the app module hands the same href", href !== undefined && builtScriptsHold(app, href), true);
	});

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
