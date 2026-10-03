import WidgetariumPlugin from "../apps/obsidian/src/main.js";
import { TFile, stringifyYaml } from "obsidian";
import type { App, PluginManifest } from "obsidian";
import { normalizeBoard, serializeBoard } from "../packages/core/src/model.js";
import type { Board } from "../packages/core/src/model.js";
import type { EditorBlock, WriteJob } from "../apps/obsidian/src/board-writes.js";
import { standIn } from "./stand-in.ts";

let failed = 0;
function check(name: string, got: unknown, want: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
}

const FENCE_OPEN = "```widgetarium\n";
const BLOCK_BODY = 'v: 2\ntiles:\n  - id: a\n    widget: "@default/search-input"';
const NOTE = `# Orbitask\n\n${FENCE_OPEN}${BLOCK_BODY}\n\`\`\`\n\nAfter.\n`;
const FENCE_LINE = 2;
const board = normalizeBoard({
	tiles: [
		{
			id: "a",
			widget: "@default/search-input",
			props: { value: { implementation: "@core/typed-value", fields: { value: "Hi" } } },
		},
	],
});

interface LiveWidget {
	readonly start: number;
	end: number;
	code?: string;
}

interface LiveEditor {
	readonly doc: { text: string };
	readonly widget: LiveWidget;
	readonly editorBlock: EditorBlock;
}

function liveEditor(text: string, fenceLine = FENCE_LINE): LiveEditor {
	const doc = { text };
	const start =
		text
			.split("\n")
			.slice(0, fenceLine + 1)
			.join("\n").length + 1;
	const widget: LiveWidget = { start, end: text.indexOf("\n```", start) };
	const replaceCode = (code: string): void => {
		doc.text = doc.text.slice(0, widget.start) + code + doc.text.slice(widget.end);
		widget.end = widget.start + code.length;
		widget.code = code;
	};
	return { doc, widget, editorBlock: { replaceCode, section: () => ({ text: doc.text, lineStart: fenceLine }) } };
}

const codeAsObsidianReadsIt = ({ doc, widget }: LiveEditor): string =>
	doc.text.slice(widget.start, doc.text.indexOf("\n```", widget.start));

const BOARD_FILE = Object.assign(new TFile(), { path: "Board.md" });

function pluginWithVault(note: string): { plugin: WidgetariumPlugin; vault: { note: string; modified: number } } {
	const vault = { note, modified: 0 };
	const process = async (_given: TFile, change: (data: string) => string): Promise<string> => {
		vault.note = change(vault.note);
		vault.modified += 1;
		return vault.note;
	};
	const app = standIn<App>(
		{ vault: { getAbstractFileByPath: (path: string) => (path === BOARD_FILE.path ? BOARD_FILE : null), process } },
		["vault"],
		"app",
	);
	const manifest = standIn<PluginManifest>({ id: "widgetarium" }, ["id"], "manifest");
	const plugin = Object.assign(new WidgetariumPlugin(app, manifest), { app });
	return { plugin, vault };
}

const NO_EDITOR: EditorBlock = { section: () => null };

const writeJob = (editorBlock: EditorBlock, blockIndex = 0): WriteJob => ({
	sourcePath: "Board.md",
	blockIndex,
	board,
	editorBlock,
});

const boardLosingItsTiles = (): Board =>
	Object.defineProperty({ ...board }, "tiles", {
		get: () => {
			throw new TypeError("the board holds no tiles");
		},
	});

async function quietly(run: () => Promise<void>): Promise<string[]> {
	const said: string[] = [];
	const was = console.error;
	console.error = (line: unknown) => said.push(String(line));
	await run();
	console.error = was;
	return said;
}

{
	const editor = liveEditor(NOTE);
	const { plugin, vault } = pluginWithVault(NOTE);
	await plugin.writeBlock(writeJob(editor.editorBlock));
	check(
		"a board open in the editor is written through the block's own code",
		editor.doc.text.includes("value: Hi"),
		true,
	);
	check("and the file is not rewritten behind the editor's back", vault.modified, 0);
	check(
		"the code handed over is exactly what Obsidian reads between the fences, so the widget is reused",
		editor.widget.code,
		codeAsObsidianReadsIt(editor),
	);
	check(
		"the text around the block is untouched",
		[editor.doc.text.startsWith(`# Orbitask\n\n${FENCE_OPEN}`), editor.doc.text.endsWith("\n```\n\nAfter.\n")],
		[true, true],
	);
	check("and no blank line creeps in before the closing fence", editor.doc.text.includes("\n\n```\n\nAfter."), false);
}

{
	const { plugin, vault } = pluginWithVault(NOTE);
	await plugin.writeBlock(writeJob({ replaceCode: undefined, section: () => null }));
	check("without replaceCode the block is written into the file", vault.note.includes("value: Hi"), true);
	check("in one atomic process", vault.modified, 1);
}

{
	const { plugin, vault } = pluginWithVault(NOTE);
	await plugin.writeBlock(writeJob({ replaceCode() {}, section: () => ({ text: NOTE, lineStart: FENCE_LINE }) }));
	check(
		"a replaceCode that changed nothing falls back to the file, so the write is never lost",
		vault.note.includes("value: Hi"),
		true,
	);
}

{
	const code = stringifyYaml(serializeBoard(board)).trimEnd();
	const withTwin = `${NOTE}\n${FENCE_OPEN}${code}\n\`\`\`\n`;
	const { plugin, vault } = pluginWithVault(NOTE);
	await plugin.writeBlock(writeJob({ replaceCode() {}, section: () => ({ text: withTwin, lineStart: FENCE_LINE }) }));
	check(
		"the same board text in another block does not count as this block written",
		vault.note.includes("value: Hi"),
		true,
	);
}

{
	const { plugin, vault } = pluginWithVault(NOTE);
	const said = await quietly(() =>
		plugin.writeBlock(
			writeJob({
				replaceCode() {
					throw new Error("the editor is gone");
				},
				section: () => null,
			}),
		),
	);
	check("an editor that throws hands the write to the file", vault.note.includes("value: Hi"), true);
	check(
		"and says why",
		said.some((line) => line.includes("refused")),
		true,
	);
}

{
	const { plugin, vault } = pluginWithVault(NOTE);
	const said = await quietly(() => plugin.writeBlock(writeJob(NO_EDITOR, 3)));
	check("a block the file no longer holds leaves the note as it was", vault.note, NOTE);
	check(
		"and says so",
		said.some((line) => line.includes("cancelled")),
		true,
	);
}

{
	const { plugin, vault } = pluginWithVault(NOTE);
	plugin.pending = new Map([
		[
			"Board.md#0",
			{
				...writeJob({
					replaceCode() {
						throw new Error("gone");
					},
					section: () => null,
				}),
				board: boardLosingItsTiles(),
			},
		],
		["Board.md#1", writeJob(NO_EDITOR, 0)],
	]);
	await quietly(() => plugin.flushWrites());
	check(
		"one board that fails to write does not drop the next one in the batch",
		vault.note.includes("value: Hi"),
		true,
	);
}

console.log(failed ? `\n${failed} failed` : "\nthe board is written where the editor keeps it");
process.exit(failed ? 1 : 0);
