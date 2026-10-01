import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { isObject } from "../packages/core/src/engine/is-object.js";
import type { ShotSize } from "./harness.ts";
import { SHOT_NAMES, shotBox, shotInputHash, widgetFolders } from "./shot-widgets.ts";

const { SHOT_BYTE_CAP } = await import("../packages/core/src/engine/shot.js");

const DEVICE_SCALE = 2;

function pngSize(at: string): ShotSize {
	const held = readFileSync(at);
	return { width: held.readUInt32BE(16), height: held.readUInt32BE(20) };
}

const fieldOf = (value: unknown, key: string): unknown => (isObject(value) ? value[key] : undefined);

let failed = 0;
let checked = 0;

function check(label: string, ok: boolean, said: string): void {
	checked += 1;
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${label}${ok ? "" : `  ${said}`}`);
}

for (const { id, folder } of widgetFolders()) {
	const manifest: unknown = JSON.parse(readFileSync(path.join(folder, "manifest.generated.json"), "utf8"));
	const declared = fieldOf(fieldOf(fieldOf(manifest, "preview"), "shot"), "of");
	if (!declared) {
		console.log(`--  ${id} declares no shot, so its card draws live`);
		continue;
	}

	const box = shotBox(manifest);
	for (const [theme, shotName] of Object.entries(SHOT_NAMES)) {
		const at = path.join(folder, shotName);
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
	check(
		`${id}: the shot was taken from the widget as it stands`,
		now === declared,
		`declares ${String(declared)}, inputs hash ${now}`,
	);
}

console.log(
	failed
		? `\n${failed} of ${checked} checks FAILED: a shot is the wrong size, over the cap, or older than its widget`
		: `\n${checked} checks: every declared shot exists, fits its declaration and matches its widget`,
);
process.exit(failed ? 1 : 0);
