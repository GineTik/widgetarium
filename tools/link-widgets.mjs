// Widgets live in this repo and are LINKED into the vault, not copied. The vault folder
// cannot be listed from a sandboxed process, so a copy could never be verified — a link is
// written once and every later edit is live with nothing to re-run.
import fs from "node:fs";
import path from "node:path";

const VAULT = process.env.WG_VAULT ?? "/Users/denissevcuk/Documents/Obsidian/Personal/Personal";
const target = path.join(VAULT, ".widgetarium", "widgets");
const here = path.join(process.cwd(), "widgets");

if (!fs.existsSync(here)) {
	console.log("no registry/ folder in this repo — nothing to link");
	process.exit(0);
}

fs.mkdirSync(target, { recursive: true });

for (const scope of fs.readdirSync(here).filter((name) => name.startsWith("@"))) {
	const link = path.join(target, scope);
	fs.rmSync(link, { recursive: true, force: true });
	fs.symlinkSync(path.join(here, scope), link);
	const widgets = fs.readdirSync(path.join(here, scope)).filter((name) => !name.startsWith("."));
	console.log(`linked ${scope} — ${widgets.length} widgets: ${widgets.join(", ")}`);
}
