// package.json says commonjs, so the ES sources need an .mjs mirror to be imported directly.
// Walks subfolders: the engine and the adapters live in their own, and a flat copy silently
// left them out of every test.
import fs from "node:fs";
import path from "node:path";

export function buildMirror() {
	const cache = path.join(process.cwd(), "tools", ".mjs-cache");
	fs.rmSync(cache, { recursive: true, force: true });
	copyTree("src", cache);
	// The adapter imports "obsidian", which exists only inside the app. Without a stand-in it
	// could not be imported at all, so every test reimplemented it — and then proved a
	// reimplementation instead of the code that ships.
	fs.writeFileSync(path.join(cache, "obsidian.mjs"), OBSIDIAN_STUB);
	return "./.mjs-cache";
}

const OBSIDIAN_STUB = `export class TAbstractFile {}
export class TFile extends TAbstractFile {}
export class TFolder extends TAbstractFile {}
export class Notice { constructor(message) { this.message = message; } }
export class Plugin {
	async loadData() { return this._data ?? null; }
	async saveData(data) { this._data = data; }
}
export class Modal {}
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
export const requestUrl = () => { throw new Error("requestUrl is not stubbed"); };
export const parseYaml = () => { throw new Error("parseYaml is not stubbed"); };
export const stringifyYaml = () => { throw new Error("stringifyYaml is not stubbed"); };
`;

function copyTree(from, to) {
	fs.mkdirSync(to, { recursive: true });
	for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
		const source = path.join(from, entry.name);
		if (entry.isDirectory()) {
			copyTree(source, path.join(to, entry.name));
			continue;
		}
		if (!entry.name.endsWith(".js")) continue;
		const depth = path.relative(path.join(process.cwd(), "tools", ".mjs-cache"), to).split(path.sep).filter(Boolean).length;
		const toStub = depth === 0 ? "./obsidian.mjs" : `${"../".repeat(depth)}obsidian.mjs`;
		const body = fs
			.readFileSync(source, "utf8")
			.replace(/from "(\.\.?\/[\w./-]+)\.js"/g, 'from "$1.mjs"')
			.replace(/from "obsidian"/g, `from "${toStub}"`);
		fs.writeFileSync(path.join(to, entry.name.replace(/\.js$/, ".mjs")), body);
	}
}
