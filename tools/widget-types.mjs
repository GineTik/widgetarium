import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const HANDED_TO_A_WIDGET = "packages/sdk/types/widgetarium.d.ts";
const GLOBALS = "packages/sdk/types/globals.d.ts";
const GATEWAY_AT = "types/gateway";
const REACT_STAND_IN = "tools/vault-types/react.d.ts";

function declarationsOf(outDir) {
	execFileSync(
		"npx",
		[
			"--no-install",
			"tsc",
			"-p",
			"tsconfig.json",
			"--noEmit",
			"false",
			"--declaration",
			"--emitDeclarationOnly",
			"--rootDir",
			"packages/core/src",
			"--outDir",
			outDir,
		],
		{ stdio: "pipe" },
	);
	const at = path.join(outDir, "gateway");
	return Object.fromEntries(
		fs.readdirSync(at).map((name) => [`${GATEWAY_AT}/${name}`, fs.readFileSync(path.join(at, name), "utf8")]),
	);
}

const vaultFacing = (text) => text.replaceAll("../../core/src/gateway/", "./gateway/");

function standaloneTsconfig() {
	const held = JSON.parse(fs.readFileSync("tsconfig.widgets.json", "utf8"));
	const options = {
		...held.compilerOptions,
		paths: { widgetarium: ["./types/widgetarium.d.ts"] },
		noImplicitAny: false,
		noUnusedLocals: false,
		skipLibCheck: true,
	};
	return `${JSON.stringify({ compilerOptions: options, include: ["./types/**/*.d.ts", "./**/*.tsx"] }, null, "\t")}\n`;
}

export function widgetTypeFiles() {
	const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "wg-types-"));
	try {
		return {
			"types/widgetarium.d.ts": vaultFacing(fs.readFileSync(HANDED_TO_A_WIDGET, "utf8")),
			"types/globals.d.ts": fs.readFileSync(GLOBALS, "utf8"),
			"types/react.d.ts": fs.readFileSync(REACT_STAND_IN, "utf8"),
			"tsconfig.json": standaloneTsconfig(),
			...declarationsOf(outDir),
		};
	} finally {
		fs.rmSync(outDir, { recursive: true, force: true });
	}
}
