import fs from "node:fs";
import { differences, propsOfEveryShippedWidget } from "./widget-props.ts";

let failed = 0;
let checks = 0;
function check(name: string, complaints: readonly string[]): void {
	checks += 1;
	if (complaints.length === 0) {
		console.log(`OK  ${name}`);
		return;
	}
	failed += 1;
	console.log(`!!  ${name}`);
	for (const line of complaints) console.log(`      ${line}`);
}

function recordOf(value: unknown, named: string): Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${named} is not an object`);
	return Object.fromEntries(Object.entries(value));
}

const FROZEN = "tools/widget-props.json";
const frozen = recordOf(JSON.parse(fs.readFileSync(FROZEN, "utf8")), FROZEN);
const resolved = await propsOfEveryShippedWidget();

check(
	`every widget the engine loaded is written in ${FROZEN}`,
	differences(Object.keys(frozen), Object.keys(resolved), ["widgets"]),
);

for (const [id, wanted] of Object.entries(frozen)) {
	check(
		`${id}: the engine resolves the props it was declaring before they moved`,
		differences(wanted, resolved[id] ?? null, [id]),
	);
}

console.log(failed ? `props gate: ${failed} of ${checks} checks red` : `props gate: clean, ${checks} checks`);
if (failed) process.exit(1);
