import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { SHOT_NAMES, shotBox, shotInputHash, widgetFolders } from "./shot-widgets.mjs";

const { SHOT_BYTE_CAP } = await import("./.mjs-cache/engine/shot.mjs");

const DEVICE_SCALE = 2;

function pngSize(at) {
	const held = readFileSync(at);
	return { width: held.readUInt32BE(16), height: held.readUInt32BE(20) };
}

let failed = 0;
let checked = 0;

function check(label, ok, said) {
	checked += 1;
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${label}${ok ? "" : `  ${said}`}`);
}

for (const { id, folder } of widgetFolders()) {
	const manifest = JSON.parse(readFileSync(path.join(folder, "manifest.json"), "utf8"));
	const declared = manifest.preview?.shot?.of;
	if (!declared) {
		console.log(`--  ${id} declares no shot, so its card draws live`);
		continue;
	}

	const box = shotBox(manifest);
	for (const theme of Object.keys(SHOT_NAMES)) {
		const at = path.join(folder, SHOT_NAMES[theme]);
		if (!existsSync(at)) {
			check(`${id} ${theme}: the file the manifest promises is there`, false, `${at} is missing`);
			continue;
		}

		const drawn = pngSize(at);
		const wanted = { width: box.width * DEVICE_SCALE, height: box.height * DEVICE_SCALE };
		check(
			`${id} ${theme}: taken at the size the manifest declares`,
			drawn.width === wanted.width && drawn.height === wanted.height,
			`${drawn.width}x${drawn.height}, wants ${wanted.width}x${wanted.height}`,
		);

		const bytes = statSync(at).size;
		check(`${id} ${theme}: within the byte cap`, bytes <= SHOT_BYTE_CAP, `${bytes} bytes over ${SHOT_BYTE_CAP}`);
	}

	const now = shotInputHash(folder);
	check(`${id}: the shot was taken from the widget as it stands`, now === declared, `declares ${declared}, inputs hash ${now}`);
}

console.log(
	failed
		? `\n${failed} of ${checked} checks FAILED: a shot is the wrong size, over the cap, or older than its widget`
		: `\n${checked} checks: every declared shot exists, fits its declaration and matches its widget`,
);
process.exit(failed ? 1 : 0);
