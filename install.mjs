import { copyFile, mkdir, realpath } from "node:fs/promises";

const VAULT = process.env.WG_VAULT ?? "/Users/denissevcuk/Documents/Obsidian/Personal/Personal";
const target = `${VAULT}/.obsidian/plugins/widgetarium`;

// The vault's plugin folder may be a SYMLINK back to this repo — that is the fastest way
// to work, since an edit here is instantly live. But then every copy below would be a file
// onto itself, which truncates it. Detect that and do nothing.
const here = await realpath(".");
let linked = false;
try {
	linked = (await realpath(target)) === here;
} catch {
	linked = false;
}

if (linked) {
	console.log("plugin folder is a symlink to this repo — nothing to copy");
} else {
	await mkdir(target, { recursive: true });
	for (const file of ["main.js", "manifest.json", "styles.css"]) {
		await copyFile(file, `${target}/${file}`);
	}
	console.log("installed to", target);
}
