import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const FAKE_ENGINE = [
	{
		name: "@widgetarium/cli",
		file: "widgetarium-cli-0.1.0.tgz",
		dependencies: { "@widgetarium/core": "0.1.0", "@widgetarium/kit": "0.1.0" },
	},
	{
		name: "@widgetarium/vite",
		file: "widgetarium-vite-0.1.0.tgz",
		dependencies: { "@widgetarium/core": "0.1.0" },
	},
	{
		name: "@widgetarium/core",
		file: "widgetarium-core-0.1.0.tgz",
		dependencies: { "@widgetarium/kit": "0.1.0", yaml: "^2.9.0" },
	},
	{ name: "@widgetarium/kit", file: "widgetarium-kit-0.1.0.tgz", dependencies: {} },
	{ name: "@widgetarium/packs-obsidian", file: "widgetarium-packs-obsidian-0.1.0.tgz", dependencies: {} },
];

export function fakeEngine(into: string, skipped: string | null = null): string {
	fs.mkdirSync(into, { recursive: true });
	for (const { name, file, dependencies } of FAKE_ENGINE.filter((tarball) => tarball.name !== skipped)) {
		const staged = fs.mkdtempSync(path.join(os.tmpdir(), "wg-fake-tarball-"));
		fs.mkdirSync(path.join(staged, "package"));
		fs.writeFileSync(
			path.join(staged, "package/package.json"),
			JSON.stringify({ name, version: "0.1.0", dependencies }),
		);
		execFileSync("tar", ["-czf", path.join(into, file), "-C", staged, "package"]);
		fs.rmSync(staged, { recursive: true, force: true });
	}
	return into;
}
