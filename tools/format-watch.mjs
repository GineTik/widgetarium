import { watch } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { format, resolveConfig, getFileInfo } from "prettier";

const explicitRoots = process.argv.slice(2).filter((argument) => !argument.startsWith("--"));
const ROOTS = explicitRoots.length > 0 ? explicitRoots : ["src", "widgets", "tools"];
const SETTLE_MS = 120;

const cwd = process.cwd();
const pending = new Map();

for (const root of ROOTS) {
	watch(join(cwd, root), { recursive: true }, (event, filename) => {
		if (!filename) return;
		schedule(`${root}/${filename.split(sep).join("/")}`);
	});
	process.stdout.write(`watching ${root}\n`);
}

function schedule(path) {
	clearTimeout(pending.get(path));
	pending.set(
		path,
		setTimeout(() => {
			pending.delete(path);
			formatFile(path).catch((error) => process.stdout.write(`${path}: ${error.message}\n`));
		}, SETTLE_MS),
	);
}

async function formatFile(path) {
	const absolute = join(cwd, path);
	const fileInfo = await getFileInfo(absolute, { ignorePath: join(cwd, ".prettierignore") });
	if (fileInfo.ignored || !fileInfo.inferredParser) return;
	const before = await readFile(absolute, "utf8").catch(() => null);
	if (before === null) return;
	const options = await resolveConfig(absolute);
	const after = await format(before, { ...options, filepath: absolute });
	if (after === before) return;
	await writeFile(absolute, after);
	process.stdout.write(`formatted ${relative(cwd, absolute)}\n`);
}
