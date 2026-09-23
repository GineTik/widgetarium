// package.json says commonjs, so the ES sources need an .mjs mirror to be imported directly.
// Walks subfolders: the engine and the adapters live in their own, and a flat copy silently
// left them out of every test.
import fs from "node:fs";
import path from "node:path";
import { transform } from "sucrase";
import { widgetTypeFiles } from "./widget-types.mjs";

const PUBLISHED_WIDGETS = path.join("tools", ".widgets-published");
const SOURCE_ROOTS = ["packages/kit/src", "packages/core/src", "apps/obsidian/src"];
const KIT_EXPORTS = JSON.parse(fs.readFileSync(path.join("packages", "kit", "package.json"), "utf8")).exports;
let published = null;

const reachesAVault = (name) => !name.endsWith(".md");

function publishInto(from, to, keeps = () => true) {
	fs.mkdirSync(to, { recursive: true });
	for (const entry of fs.readdirSync(from, { withFileTypes: true }).filter((one) => keeps(one.name))) {
		const source = path.join(from, entry.name);
		if (entry.isDirectory()) publishInto(source, path.join(to, entry.name));
		else fs.copyFileSync(source, path.join(to, entry.name));
	}
}

export function buildWidgets() {
	if (published) return published;

	const to = path.join(process.cwd(), PUBLISHED_WIDGETS);
	fs.rmSync(to, { recursive: true, force: true });
	publishInto("registry", to, reachesAVault);
	publishInto(path.join("packages", "sdk", "types"), path.join(to, "types"));
	published = to;
	return to;
}

export function buildMirror({ widgetsCli = null } = {}) {
	buildWidgets();
	const cache = path.join(process.cwd(), "tools", ".mjs-cache");
	fs.rmSync(cache, { recursive: true, force: true });
	for (const root of SOURCE_ROOTS) copyTree(root, cache);
	// The adapter imports "obsidian", which exists only inside the app. Without a stand-in it
	// could not be imported at all, so every test reimplemented it — and then proved a
	// reimplementation instead of the code that ships.
	fs.writeFileSync(path.join(cache, "obsidian.mjs"), OBSIDIAN_STUB);
	fs.writeFileSync(path.join(cache, "surface-source.mjs"), "export const REACT_SURFACE_SOURCE = null;\n");
	fs.writeFileSync(
		path.join(cache, "widgets-cli-source.mjs"),
		`export default ${JSON.stringify(widgetsCli ?? fs.readFileSync(path.join("apps", "obsidian", "src", "ai", "widgets-cli.mjs"), "utf8"))};\n`,
	);
	fs.writeFileSync(
		path.join(cache, "widget-types-source.mjs"),
		`export default ${JSON.stringify(widgetTypeFiles())};\n`,
	);
	return "./.mjs-cache";
}

export const OBSIDIAN_STUB = `import { parse, stringify } from "yaml";
export class TAbstractFile {}
export class TFile extends TAbstractFile {}
export class TFolder extends TAbstractFile {}
export class Notice { constructor(message) { this.message = message; } }
export class Plugin {
	async loadData() { return this._data ?? null; }
	async saveData(data) { this._data = data; }
	register() {}
	registerEvent() {}
}
export class Modal {}
export class ItemView { constructor(leaf) { this.leaf = leaf; } }
export class PluginSettingTab { constructor(app, plugin) { this.app = app; this.plugin = plugin; } }
export class Setting {}
export class MarkdownRenderChild { constructor(containerEl) { this.containerEl = containerEl; } }
// CONTEXT: the real one carries these flags; a stand-in that omitted them made every build desktop
export const Platform = { isDesktopApp: true, isMobileApp: false, isMobile: false };
// A STAND-IN, not a reimplementation to be believed: what it is here for is the ARGUMENT
// ORDER, read off the shipped runtime — render(app, markdown, el, sourcePath, component),
// which appends into el and returns a promise.
//
// A FENCE is the one exception. It has to arrive as the <pre><code> the real renderer builds,
// or nothing downstream of a code block can be tested at all. A caller handing over a plain
// object rather than a node still gets exactly the text it got before.
const FENCE = String.fromCharCode(96, 96, 96);
export const MarkdownRenderer = {
	calls: [],
	async render(app, markdown, el, sourcePath, component) {
		MarkdownRenderer.calls.push({ app, markdown, el, sourcePath, component });
		const text = String(markdown ?? "");
		if (!el.ownerDocument || !text.includes(FENCE)) {
			el.textContent = (el.textContent ?? "") + text;
			return;
		}
		text.split(FENCE).forEach((part, at) => {
			const fenced = at % 2 === 1;
			const block = el.ownerDocument.createElement(fenced ? "pre" : "p");
			if (!fenced) block.textContent = part;
			else block.appendChild(el.ownerDocument.createElement("code")).textContent = part.replace(/^[a-z-]*\\n/, "");
			// CONTEXT: Obsidian's own post-processor puts this button in every rendered code block
			if (fenced) block.appendChild(el.ownerDocument.createElement("button")).className = "copy-code-button";
			el.appendChild(block);
		});
	},
};
// CONTEXT: the real one takes { url } and answers { status, text, json } — a test hands the
// installer its own doors, so nothing here should ever actually be reached
export const setIcon = (parent, iconId) => { parent.dataset.icon = iconId; };
export const requestUrl = () => { throw new Error("requestUrl is not stubbed"); };
export const parseYaml = (text) => parse(text);
export const stringifyYaml = (value) => stringify(value);
`;

function withTextImports(code, source) {
	return code.replace(/import (\w+) from "([^"]+\.md)";/g, (whole, name, specifier) => {
		const at = path.resolve(path.dirname(source), specifier);
		return `const ${name} = ${JSON.stringify(fs.readFileSync(at, "utf8"))};`;
	});
}

function mirroredWorkspaceImport(name, subpath, cacheRoot) {
	const file = name === "kit" ? KIT_EXPORTS[`.${subpath}`].replace(/^\.\/src\//, "") : subpath.replace(/^\//, "");
	return `from "${cacheRoot}${file.replace(/\.(js|ts|tsx|mjs)$/, "")}.mjs"`;
}

const TRANSFORMS_BY_EXTENSION = { ".js": [], ".ts": ["typescript"], ".tsx": ["typescript", "jsx"] };

function stripped(read, source) {
	const transforms = TRANSFORMS_BY_EXTENSION[path.extname(source)];
	if (transforms.length === 0) return read;
	return transform(read, { transforms, filePath: source, jsxPragma: "h", jsxFragmentPragma: "Fragment" }).code;
}

function mirrored(source, toStub) {
	const read = fs.readFileSync(source, "utf8");
	return (
		withTextImports(stripped(read, source), source)
			.replace(/from "widgetarium:surface"/g, `from "${toStub.replace("obsidian.mjs", "surface-source.mjs")}"`)
			.replace(/from "widgetarium:widgets-cli"/g, `from "${toStub.replace("obsidian.mjs", "widgets-cli-source.mjs")}"`)
			.replace(
				/from "widgetarium:widget-types"/g,
				`from "${toStub.replace("obsidian.mjs", "widget-types-source.mjs")}"`,
			)
			.replace(/from "@widgetarium\/(kit|core)([^"]*)"/g, (whole, name, subpath) =>
				mirroredWorkspaceImport(name, subpath, toStub.replace("obsidian.mjs", "")),
			)
			.replace(/from "(\.\.?\/[\w./-]+)\.js"/g, 'from "$1.mjs"')
			// CONTEXT: TS sources import without an extension; node needs the mirror's .mjs spelled out
			.replace(/from "(\.\.?\/[\w./-]+)"/g, (whole, specifier) =>
				specifier.endsWith(".mjs") || specifier.endsWith(".css") ? whole : `from "${specifier}.mjs"`,
			)
			.replace(/from "obsidian"/g, `from "${toStub}"`)
	);
}

function copyTree(from, to) {
	fs.mkdirSync(to, { recursive: true });
	for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
		const source = path.join(from, entry.name);
		if (entry.isDirectory()) {
			copyTree(source, path.join(to, entry.name));
			continue;
		}
		if (!(path.extname(entry.name) in TRANSFORMS_BY_EXTENSION)) continue;
		const depth = path
			.relative(path.join(process.cwd(), "tools", ".mjs-cache"), to)
			.split(path.sep)
			.filter(Boolean).length;
		const toStub = depth === 0 ? "./obsidian.mjs" : `${"../".repeat(depth)}obsidian.mjs`;
		fs.writeFileSync(path.join(to, entry.name.replace(/\.(js|tsx|ts)$/, ".mjs")), mirrored(source, toStub));
	}
}
