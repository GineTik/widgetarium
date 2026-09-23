import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const PACKAGE = "emojibase-data@16.0.3";
const TREE = "https://api.github.com/repos/microsoft/fluentui-emoji/git/trees/main?recursive=1";
const RAW = "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/";
const VIEW_BOX = "0 0 32 32";
const SMILEYS_AND_EMOTION = 0;
const LAST_FACE_SUBGROUP = 13;
const AT_ONCE = 8;

const TABLE_FILE = path.join(process.cwd(), "packages", "kit", "src", "emoji-table.js");
const NOTICE_DIR = path.join(process.cwd(), "packages", "kit", "assets", "emojis");

const MIT = `MIT License

Copyright (c) Microsoft Corporation.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

const NOTICE = `The emoji drawings in packages/kit/src/emoji-table.js are Microsoft Fluent Emoji
(https://github.com/microsoft/fluentui-emoji), Flat style, licensed under the
MIT License, a copy of which sits beside this file.

Which emojis are taken, and what each is named, comes from CLDR through
emojibase-data (https://github.com/milesj/emojibase), also MIT.

The pack is the Unicode group "Smileys & Emotion" up to and including the
monkey faces — every face Fluent draws, and nothing else.

Regenerate with: node tools/fetch-emojis.mjs

Each body is the inside of an SVG drawn on viewBox="${VIEW_BOX}".
`;

const installDir = mkdtempSync(path.join(tmpdir(), "wg-emojis-"));
writeFileSync(path.join(installDir, "package.json"), JSON.stringify({ name: "wg-emojis", private: true }));
execFileSync("npm", ["install", "--no-audit", "--no-fund", "--silent", PACKAGE], { cwd: installDir, stdio: "inherit" });

const load = createRequire(path.join(installDir, "index.js"));
const cldr = load("emojibase-data/en/data.json");
const unicodeNameByHexcode = load("emojibase-data/meta/unicode-names.json");

const kebab = (name) =>
	name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");

const wanted = cldr.filter((entry) => entry.group === SMILEYS_AND_EMOTION && entry.subgroup <= LAST_FACE_SUBGROUP);

const tree = await (await fetch(TREE)).json();
if (tree.truncated) throw new Error("the fluentui-emoji tree came back truncated — nothing may be resolved from it");

const flatPathByFolder = new Map();
for (const node of tree.tree) {
	const parts = /^assets\/([^/]+)\/(?:Default\/)?Flat\/[^/]+\.svg$/.exec(node.path);
	if (parts) flatPathByFolder.set(parts[1].toLowerCase(), node.path);
}

// TODO: drop a row once Fluent renames that folder to the name CLDR or Unicode gives it
const FLUENT_FOLDER_BY_HEXCODE = {
	"1F635": "Knocked-out face",
};

function flatPathUnderAnyName(entry) {
	const names = [entry.label, unicodeNameByHexcode[entry.hexcode], FLUENT_FOLDER_BY_HEXCODE[entry.hexcode]];
	for (const name of names) {
		const at = flatPathByFolder.get(String(name ?? "").toLowerCase());
		if (at) return at;
	}
	return null;
}

function bodyOf(svg, name) {
	if (!svg.includes(`viewBox="${VIEW_BOX}"`)) throw new Error(`${name} is not drawn on ${VIEW_BOX}`);
	return svg
		.replace(/^[\s\S]*?<svg[^>]*>/, "")
		.replace(/<\/svg>\s*$/, "")
		.replace(/>\s+</g, "><")
		.trim();
}

async function drawnBody(entry, at) {
	const response = await fetch(RAW + at.split("/").map(encodeURIComponent).join("/"));
	if (!response.ok) throw new Error(`${entry.label} answered ${response.status}`);
	return bodyOf(await response.text(), entry.label);
}

const resolved = wanted.map((entry) => ({ entry, at: flatPathUnderAnyName(entry) }));
const undrawn = resolved.filter((held) => !held.at);
const drawn = resolved.filter((held) => held.at);

const table = {};
for (let start = 0; start < drawn.length; start += AT_ONCE) {
	const batch = drawn.slice(start, start + AT_ONCE);
	const bodies = await Promise.all(batch.map(({ entry, at }) => drawnBody(entry, at)));
	batch.forEach(({ entry }, index) => {
		table[kebab(entry.label)] = bodies[index];
	});
}

const lines = Object.entries(table).map(([name, body]) => `\t${JSON.stringify(name)}: ${JSON.stringify(body)},`);
mkdirSync(path.dirname(TABLE_FILE), { recursive: true });
writeFileSync(
	TABLE_FILE,
	`export const EMOJI_VIEW_BOX = ${JSON.stringify(VIEW_BOX)};\n\nexport const EMOJI_TABLE = {\n${lines.join("\n")}\n};\n`,
);

mkdirSync(NOTICE_DIR, { recursive: true });
writeFileSync(path.join(NOTICE_DIR, "LICENSE"), MIT);
writeFileSync(path.join(NOTICE_DIR, "NOTICE"), NOTICE);

for (const held of undrawn) console.log(`no Fluent drawing for ${held.entry.emoji} ${held.entry.label}`);
console.log(`${Object.keys(table).length} emojis -> packages/kit/src/emoji-table.js`);
