import type { SourceDisk } from "../packages/core/src/engine/source-disk.js";
import { fakeVault } from "./fake-vault.ts";

const { createInstaller } = await import("../packages/core/src/installer.js");
const { WIDGETS_DIR } = await import("../packages/core/src/paths.js");
const { builtSheetPath } = await import("../packages/core/src/engine/widget-build.js");

const FOLDER = "/repo/widgets/@demo/effects";
const INSTALLED = `${WIDGETS_DIR}/@demo/effects`;

export const EFFECT_CLASSES = "shimmer scroll-fade scroll-fade-x no-scrollbar data-open:opacity-50";

const SOURCE = `import { createWidget, defineLayout } from "widgetarium";
export const layout = defineLayout({ size: { preferredWidth: 320, preferredHeight: "auto" } });
export default createWidget({ draw: () => <p className="${EFFECT_CLASSES}">Thinking</p> });
`;

const SHEET = `@import "tailwindcss";
@import "widgetarium/theme.css";
`;

function diskOver(files: ReadonlyMap<string, string>): SourceDisk {
	return {
		exists: async (at) => files.has(at) || [...files.keys()].some((held) => held.startsWith(`${at}/`)),
		read: async (at) => files.get(at) ?? "",
		folders: async (at) => {
			const under = `${at}/`;
			const held = new Set<string>();
			for (const each of files.keys()) {
				const rest = each.startsWith(under) ? each.slice(under.length) : "";
				if (rest.includes("/")) held.add(under + rest.slice(0, rest.indexOf("/")));
			}
			return [...held];
		},
	};
}

export async function effectsBuiltByTailwind(): Promise<string> {
	const shelf = fakeVault();
	shelf.files.set(`${FOLDER}/widget.tsx`, SOURCE);
	shelf.files.set(`${FOLDER}/widget.css`, SHEET);
	const installer = createInstaller({
		adapter: shelf,
		disk: diskOver(shelf.files),
		fetchJson: (url) => fetch(url).then((answer): Promise<unknown> => answer.json()),
		fetchText: (url) => fetch(url).then((answer) => answer.text()),
	});
	const offered = await installer.discover({ path: "/repo/widgets" });
	const first = offered[0];
	if (!first) throw new Error("the folder source offered nothing");
	const done = await installer.install(first);
	if (!done.ok) throw new Error(`the effects widget did not install: ${String(done.failure)}`);
	return String(shelf.files.get(builtSheetPath(INSTALLED)) ?? "");
}
