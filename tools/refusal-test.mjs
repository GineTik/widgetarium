import { spawnSync } from "node:child_process";
import { readdirSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";

const REFUSED_AT = "tools/type-gate/refused";

const WANTED = {
	"undeclared-verb.tsx": ["Property 'remove' does not exist", "Property 'update' does not exist"],
	"reserved-ref.tsx": ["the field ref is reserved"],
	"wrong-control.tsx": ["not assignable to type '\"number\"'"],
	"not-a-prop.tsx": ["'default' does not exist in type 'Prop<unknown, unknown>'"],
	"default-does-not-fit.tsx": ["Type 'number' is not assignable to type 'string'"],
};

const CONFIG_AT = path.join(REFUSED_AT, "tsconfig.checked.json");

function saidBy(file) {
	writeFileSync(
		CONFIG_AT,
		JSON.stringify({
			extends: "../../../packages/sdk/tsconfig.widgets.json",
			compilerOptions: { paths: { widgetarium: ["../../../packages/sdk/types/widgetarium.d.ts"] } },
			include: ["../../../packages/sdk/types/**/*.d.ts", `./${file}`],
		}),
	);
	const run = spawnSync("npx", ["--no-install", "tsc", "-p", CONFIG_AT], { encoding: "utf8" });
	return `${run.stdout ?? ""}${run.stderr ?? ""}`;
}

let failures = 0;

for (const file of readdirSync(REFUSED_AT).filter((name) => name.endsWith(".tsx"))) {
	const wanted = WANTED[file];
	if (!wanted) {
		failures += 1;
		console.log(`not ok ${file} is not named in this check`);
		continue;
	}
	const said = saidBy(file);
	for (const part of wanted) {
		const refused = said.includes(part);
		if (!refused) failures += 1;
		console.log(
			`${refused ? "ok  " : "not ok"} ${file} is refused: ${part}${refused ? "" : `\n      said ${said.slice(0, 600)}`}`,
		);
	}
}

rmSync(CONFIG_AT, { force: true });
console.log(failures === 0 ? "refusals: every check passed" : `refusals: ${failures} checks red`);
process.exit(failures === 0 ? 0 : 1);
