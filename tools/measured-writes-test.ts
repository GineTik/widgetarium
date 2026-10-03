import type { BoardMeasure, MeasureApp } from "../packages/core/src/surface-measure.js";

const { writeMeasured } = await import("../packages/core/src/surface-measure.js");

let failed = 0;
let checks = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	checks += 1;
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "ok  " : "FAIL"} ${what}${ok ? "" : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(wanted)}`}`,
	);
}

const PATH = ".widgetarium/agent/measured/Board.md.json";
const onDisk = new Map<string, string>();
const writes: string[] = [];
const localStorageOfVault = new Map<string, unknown>();
const adapter = {
	exists: async (path: string) => onDisk.has(path) || path.endsWith("/measured"),
	mkdir: async () => {},
	write: async (path: string, text: string) => {
		writes.push(path);
		onDisk.set(path, text);
	},
};
const sessionOfApp = (): MeasureApp => ({
	vault: { adapter },
	loadLocalStorage: (key) => structuredClone(localStorageOfVault.get(key) ?? null),
	saveLocalStorage: (key, data) => localStorageOfVault.set(key, structuredClone(data)),
});
const measured = (page: string): BoardMeasure => ({ theme: "light", page, presets: {}, tiles: {}, extents: {} });

await writeMeasured(sessionOfApp(), adapter, PATH, measured("white"));
check("the first measurement of a board is written", writes, [PATH]);

writes.length = 0;
await writeMeasured(sessionOfApp(), adapter, PATH, measured("white"));
check("an unchanged measurement in a later session writes nothing", writes, []);

await writeMeasured(sessionOfApp(), adapter, PATH, measured("grey"));
check("a changed measurement is written", writes, [PATH]);

writes.length = 0;
onDisk.delete(PATH);
await writeMeasured(sessionOfApp(), adapter, PATH, measured("grey"));
check("a measurement whose file was deleted is written again", writes, [PATH]);

console.log(`\n${checks - failed}/${checks} measured write checks passed`);
process.exit(failed === 0 ? 0 : 1);
