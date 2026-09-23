import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildMirror } from "./mirror.mjs";

buildMirror();
const { RECORD_FILE, RECORD_FILES, cardOf, manifestOf, readRecord, recordIn } =
	await import("./.mjs-cache/engine/catalogue-index.mjs");
const { WIDGET_API } = await import("./.mjs-cache/version.mjs");
const { SHEET_FILES, SOURCE_FILES, compileWidget } = await import("./.mjs-cache/engine/widget-build.mjs");
const { ANSWERED_BY_THE_ENGINE, facadeUrl, realPathIn } = await import("./.mjs-cache/engine/modules.mjs");
const { idOfFolder } = await import("./.mjs-cache/engine/github.mjs");
const manifestBuilders = await import("./.mjs-cache/gateway/manifest.mjs");

export const PUBLISHED_SHEET = SHEET_FILES[0];

const refuse = (failure) => ({ ok: false, record: null, sheet: null, failure });

const ANYTHING = new Proxy(function anything() {}, {
	get: (held, name) => (typeof name === "symbol" ? undefined : ANYTHING),
	apply: () => ANYTHING,
	construct: () => ANYTHING,
});

function packageOf(specifier) {
	const parts = specifier.split("/");
	return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

export function packageNames(code, heldElsewhere) {
	const held = new Set(heldElsewhere);
	const found = new Set();
	for (const [, specifier] of String(code).matchAll(/require\(\s*["']([^"']+)["']\s*\)/g)) {
		if (specifier.startsWith(".") || held.has(specifier) || held.has(packageOf(specifier))) continue;
		found.add(packageOf(specifier));
	}
	return [...found].sort();
}

export function dependenciesFrom(names, lockfile) {
	const dependencies = {};
	for (const name of names) {
		const version = lockfile?.packages?.[`node_modules/${name}`]?.version;
		if (!version)
			return {
				ok: false,
				dependencies: null,
				failure: `"${name}" is imported by the widget, and the lockfile pins no version for it`,
			};
		dependencies[name] = `^${version}`;
	}
	return { ok: true, dependencies, failure: null };
}

function declaringCreateWidget(onDeclared) {
	return (first, second) => {
		if (typeof first !== "function") {
			onDeclared({ manifest: first });
			return second;
		}
		onDeclared(second ? { meta: second } : null);
		return first;
	};
}

export function declarationIn(code) {
	let declared = null;
	const surface = { ...manifestBuilders, createWidget: declaringCreateWidget((found) => (declared = found)) };
	const widgetarium = new Proxy(surface, { get: (held, name) => held[name] ?? ANYTHING });
	const globals = {
		h: () => null,
		Fragment: null,
		kitModule: ANYTHING,
		useState: (initial) => [typeof initial === "function" ? initial() : initial, () => {}],
		useEffect: () => {},
		useMemo: (make) => make(),
		useRef: () => ({ current: null }),
	};
	const shell = { exports: {} };
	new Function("require", "module", "exports", ...Object.keys(globals), code)(
		(name) => (name === "widgetarium" ? widgetarium : ANYTHING),
		shell,
		shell.exports,
		...Object.values(globals),
	);
	return declared;
}

export function widgetDependenciesIn(record) {
	const found = new Set();
	for (const spec of Object.values(record?.slots ?? {})) {
		if (typeof spec?.default === "string") found.add(spec.default);
	}
	for (const spec of Object.values(record?.mounts ?? {})) {
		for (const row of [].concat(spec?.default ?? [])) {
			if (typeof row?.widget === "string") found.add(row.widget);
		}
	}
	return [...found].sort();
}

async function esmRefusal(askEsm, dependencies) {
	for (const [name, range] of Object.entries(dependencies)) {
		const answered = await askEsm(facadeUrl(name, range)).catch((failure) => String(failure?.message ?? failure));
		if (!realPathIn(answered)) return `"${name}@${range}" has no ES module build on esm.sh, so no vault could load it`;
	}
	return null;
}

export async function publishWidget({ folder, files, lockfile, askEsm }) {
	const from = SOURCE_FILES.find((name) => typeof files?.[name] === "string");
	if (!from) return refuse(`${folder} holds no widget source`);

	const id = idOfFolder(folder);
	if (!id) return refuse(`${folder} is not a @scope/name folder`);

	let card;
	let code;
	let declared;
	try {
		card = readRecord(JSON.parse(recordIn(files) ?? null), id);
		code = compileWidget(files[from], `${folder}/${from}`);
		declared = declarationIn(code);
	} catch (failure) {
		return refuse(`${folder} could not be read: ${String(failure?.message ?? failure)}`);
	}

	const scope = id.slice(0, id.indexOf("/"));
	const found = dependenciesFrom(packageNames(code, [...ANSWERED_BY_THE_ENGINE, `${scope}/lib`]), lockfile);
	if (!found.ok) return refuse(found.failure);

	const unservable = await esmRefusal(askEsm, found.dependencies);
	if (unservable) return refuse(unservable);

	const sheet = SHEET_FILES.map((name) => files[name]).find((text) => typeof text === "string") ?? null;
	const declaredCard = declared?.manifest ? cardOf(declared.manifest, WIDGET_API) : manifestOf(card, declared);
	const record = {
		...declaredCard,
		files: [from, ...(sheet === null ? [] : [PUBLISHED_SHEET])],
		dependencies: found.dependencies,
		widgetDependencies: widgetDependenciesIn(declaredCard),
	};
	return { ok: true, record, sheet, failure: null };
}

function filesUnder(folder) {
	const held = {};
	for (const name of [...RECORD_FILES, ...SOURCE_FILES, ...SHEET_FILES]) {
		const at = path.join(folder, name);
		if (fs.existsSync(at)) held[name] = fs.readFileSync(at, "utf8");
	}
	return held;
}

async function runCli(folder, out) {
	const files = filesUnder(folder);
	const done = await publishedFromDisk(folder, files);
	if (!done.ok) {
		console.error(`!!  ${done.failure}`);
		process.exit(1);
	}

	fs.mkdirSync(out, { recursive: true });
	fs.writeFileSync(path.join(out, RECORD_FILE), `${JSON.stringify(done.record, null, "\t")}\n`);
	for (const name of done.record.files) {
		fs.writeFileSync(path.join(out, name), name === PUBLISHED_SHEET ? done.sheet : files[name]);
	}
	console.log(`OK  ${done.record.id} → ${out}`);
}

export function widgetFolders(root) {
	return fs
		.readdirSync(root, { withFileTypes: true })
		.filter((scope) => scope.isDirectory() && scope.name.startsWith("@"))
		.flatMap((scope) =>
			fs
				.readdirSync(path.join(root, scope.name), { withFileTypes: true })
				.filter((entry) => entry.isDirectory())
				.map((entry) => path.join(root, scope.name, entry.name)),
		)
		.filter((folder) => SOURCE_FILES.some((name) => fs.existsSync(path.join(folder, name))));
}

function declaresManifest(folder, files) {
	const source = SOURCE_FILES.find((name) => typeof files[name] === "string");
	return Boolean(declarationIn(compileWidget(files[source], `${folder}/${source}`))?.manifest);
}

const publishedFromDisk = (folder, files) =>
	publishWidget({
		folder,
		files,
		lockfile: JSON.parse(fs.readFileSync("package-lock.json", "utf8")),
		askEsm: (url) => fetch(url).then((answer) => answer.text()),
	});

async function cardMadeFrom(folder) {
	try {
		const files = filesUnder(folder);
		if (!declaresManifest(folder, files)) return { skipped: true };
		return await publishedFromDisk(folder, files);
	} catch (failure) {
		return { ok: false, failure: String(failure?.message ?? failure) };
	}
}

export async function writeCardBeside(folder) {
	const done = await cardMadeFrom(folder);
	if (done.skipped) {
		console.log(`--  ${folder} still declares createWidget(component, meta), so no card was written`);
		return;
	}
	if (!done.ok) {
		console.error(`!!  ${folder}: ${done.failure}`);
		process.exitCode = 1;
		return;
	}
	fs.writeFileSync(path.join(folder, RECORD_FILE), `${JSON.stringify(done.record, null, "\t")}\n`);
	console.log(`OK  ${folder}/${RECORD_FILE}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const asked = process.argv[2];
	if (!asked) {
		console.error("!!  name the widget folder to publish, as registry/@scope/name");
		process.exit(1);
	}
	const named = process.argv.indexOf("--out");
	await runCli(asked, named < 0 ? path.join("dist", asked) : process.argv[named + 1]);
}
