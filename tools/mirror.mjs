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
export class Plugin {}
export class Modal {}
export class Setting {}
export class MarkdownRenderChild {}
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
