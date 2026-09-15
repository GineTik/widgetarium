// `background` is a WidgetRoot prop; `fill` is an SVG attribute. They are one careless
// rename apart, and that rename turned every icon into a black blob: an <svg fill="none">
// that becomes <svg background="none"> falls back to the SVG default, which is solid black.
// Nothing failed — the icons simply went dark.
import fs from "node:fs";
import path from "node:path";
import { widgetFiles } from "./widget-files.mjs";

const roots = process.argv.slice(2).filter((root) => fs.existsSync(root));
const offences = [];


for (const root of roots) {
	for (const file of widgetFiles(root)) {
		const text = fs.readFileSync(file, "utf8");
		for (const [, tag, attrs] of text.matchAll(/<([A-Za-z][\w.]*)((?:[^<>]|"[^"]*")*)>/g)) {
			const isRoot = tag === "WidgetRoot";
			if (!isRoot && /\bbackground\s*=/.test(attrs)) {
				offences.push(`${file} — <${tag}> uses background=; on anything but WidgetRoot that is the SVG fill=`);
			}
			if (isRoot && /\bfill\s*=/.test(attrs)) {
				offences.push(`${file} — <WidgetRoot> uses fill=; the prop is background=`);
			}
			if (isRoot && /\b(roundedType|fillType)\s*=/.test(attrs)) {
				offences.push(`${file} — <WidgetRoot> uses the old names; they are defaultRounded and defaultBackgroundType`);
			}
		}
	}
}

if (offences.length > 0) {
	console.error("appearance gate: background is a WidgetRoot prop, fill is an SVG attribute");
	for (const line of offences) console.error(`  ${line}`);
	process.exit(1);
}

console.log(`appearance gate: clean (${roots.length} root${roots.length === 1 ? "" : "s"})`);
