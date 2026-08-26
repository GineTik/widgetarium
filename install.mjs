import { copyFile, mkdir } from "node:fs/promises";

const VAULT = process.env.WG_VAULT ?? "/Users/denissevcuk/Documents/Obsidian/Personal/Personal";
const target = `${VAULT}/.obsidian/plugins/widgetarium`;

await mkdir(target, { recursive: true });
for (const file of ["main.js", "manifest.json", "styles.css"]) {
	await copyFile(file, `${target}/${file}`);
}
console.log("installed to", target);
