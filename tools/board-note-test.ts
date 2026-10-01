import { parse } from "yaml";
import type { App, Editor, EditorPosition, TFile, TFolder } from "obsidian";
import {
	boardBlock,
	boardNoteText,
	boardPathIn,
	boardInsertAt,
	isScreenNote,
	createBoardNote,
	insertBoardAtCursor,
} from "../apps/obsidian/src/board-note.js";
import { findBlocks } from "../packages/core/src/block-writer.js";
import { readId, withId } from "../packages/core/src/record-id.js";
import { normalizeBoard } from "../packages/core/src/model.js";
import { blockRefusal, BLOCK_FORMAT } from "../packages/core/src/version.js";
import { fieldAt, fieldIn, itemsIn, textIn } from "./held-fields.ts";
import { isRecord, present } from "./page-dom.ts";
import { standIn } from "./stand-in.ts";

const parseYaml = (text: string): unknown => parse(text);
const refusalOf = (block: unknown): string | null => blockRefusal(isRecord(block) ? block : null);

let failed = 0;
function check(name: string, got: unknown, want: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
}

function blocksIn(text: string): string[] {
	const lines = text.split("\n");
	return findBlocks(lines).map((block) => lines.slice(block.start + 1, block.end).join("\n"));
}

const note = boardNoteText();
const frontmatter = parseYaml(note.split("---\n")[1] ?? "");

check("a created note reads as a screen", isScreenNote(frontmatter), true);
check("a note without the mark is no screen", isScreenNote({ widgetarium: { wgId: "u1" } }), false);
check("the flat mark written before the move still reads as a screen", isScreenNote({ widgetarium: "screen" }), true);
check("a screen is born with an id, so a board can list every screen", Boolean(readId(frontmatter)), true);
check("and the id sits beside the kind, not instead of it", fieldAt(frontmatter, "widgetarium", "kind"), "screen");
check("an id minted onto the flat mark keeps the screen", isScreenNote(withId({ widgetarium: "screen" }, "u2")), true);
check("and that note now answers with the id", readId(withId({ widgetarium: "screen" }, "u2")), "u2");
check("the note holds exactly one board", blocksIn(note).length, 1);

const firstBlockOf = (text: string): string => present(blocksIn(text)[0], "the first board block");
const parsed = parseYaml(firstBlockOf(note));
const regions = itemsIn(fieldAt(parsed, "layout", "of"));
check("the board is written in the format this plugin reads", refusalOf(parsed), null);
check("the board declares the current format", fieldIn(parsed, "v"), BLOCK_FORMAT);
check("the board opens with no tiles", normalizeBoard(parsed).tiles.length, 0);
check("a new board is a tree, never a grid", fieldIn(parsed, "layouts") !== undefined, false);
check("and it is born with all three regions, so the first widget has somewhere to go", regions.length, 3);
check(
	"every one of them starts empty",
	regions.map((box) => fieldIn(box, "of")),
	[[], [], []],
);
check(
	"one of the three is the one that may not be folded away",
	regions.map((box) => Boolean(fieldIn(box, "keep"))),
	[false, true, false],
);
check("the tree survives being read back", normalizeBoard(parsed).layout.of.length, 3);
check("the board authors no grid layout", "layouts" in normalizeBoard(parsed), false);

check("the first board takes the plain name", boardPathIn("Screens", []), "Screens/Board.md");
check("a taken name is stepped past", boardPathIn("Screens", ["Board", "Board 2"]), "Screens/Board 3.md");
check("the vault root carries no leading slash", boardPathIn("", ["Board"]), "Board 2.md");
check("a name taken in another case is still taken", boardPathIn("Screens", ["board"]), "Screens/Board 2.md");

const held = ["# Notes", "", "Some line", "tail"];
check("a blank line takes the board itself", present(boardInsertAt(held, 1), "the insert").at, 1);
check("a written line pushes the board under it", present(boardInsertAt(held, 2), "the insert").at, 3);
check(
	"a board landing under text is preceded by a blank line",
	present(boardInsertAt(held, 2), "the insert").text.startsWith("\n"),
	true,
);
check(
	"a board landing above text is followed by a blank line",
	present(boardInsertAt(held, 2), "the insert").text.endsWith("\n\n"),
	true,
);
check(
	"the first line of the note needs no lead",
	present(boardInsertAt(["", "text"], 0), "the insert").text.startsWith("`"),
	true,
);

function inserted(lines: readonly string[], cursorLine: number): string {
	const { at, text } = present(boardInsertAt(lines, cursorLine), "the insert");
	const whole = lines.join("\n");
	const before = whole.split("\n").slice(0, at).join("\n");
	const after = whole.split("\n").slice(at).join("\n");
	return `${before}${at > 0 ? "\n" : ""}${text}${after}`;
}

check("inserting into a bare note leaves one board", blocksIn(inserted(held, 2)).length, 1);

const beside = `${note}Tail`.split("\n");
check("inserting after a board leaves two", blocksIn(inserted(beside, beside.length - 1)).length, 2);
const insideBlock = beside.findIndex((line) => line.trim() === "dir: row");
check("the cursor inside a board is a line of that board", insideBlock > 0, true);
check(
	"inserting from inside a board does not nest one in the other",
	blocksIn(inserted(beside, insideBlock)).length,
	2,
);
check(
	"and the board the cursor sat in is left whole",
	refusalOf(parseYaml(firstBlockOf(inserted(beside, insideBlock)))),
	null,
);
check("an inserted board is still readable", refusalOf(parseYaml(firstBlockOf(inserted(held, 2)))), null);
check("a created board opens as a page, because the note is the board", fieldIn(parsed, "mode"), "expanded");
check(
	"one dropped into somebody's prose takes no screen",
	fieldIn(parseYaml(firstBlockOf(inserted(held, 2))), "mode"),
	undefined,
);
check(
	"and is otherwise the very board a created note holds",
	firstBlockOf(inserted(held, 2)),
	firstBlockOf(note).split("\nmode: expanded").join(""),
);
check("the block is fenced as widgetarium", boardBlock().split("\n")[0], "```widgetarium");

interface FakeFile {
	readonly path: string;
	readonly text: string;
	readonly name: string | undefined;
}

interface FakeFolder {
	readonly path: string;
	isRoot(): boolean;
	readonly children: { readonly name: string | undefined }[];
}

function fakeCreate(folder: FakeFolder, written: FakeFile[]): (path: string, text: string) => Promise<FakeFile> {
	return async (path, text) => {
		if (written.some((file) => file.path.toLowerCase() === path.toLowerCase()))
			throw new Error(`File already exists: ${path}`);
		const file = { path, text, name: path.split("/").pop() };
		written.push(file);
		folder.children.push(file);
		return file;
	};
}

const folderOf = (folder: FakeFolder): TFolder => standIn<TFolder>(folder, ["path", "isRoot", "children"], "folder");

interface FakeVault {
	readonly doors: Pick<App, "vault" | "fileManager" | "workspace">;
	readonly written: FakeFile[];
	readonly opened: string[];
}

function fakeVault(folder: FakeFolder): FakeVault {
	const written: FakeFile[] = [];
	const opened: string[] = [];
	const doors = {
		vault: { create: fakeCreate(folder, written) },
		fileManager: { getNewFileParent: () => folderOf(folder) },
		workspace: {
			getActiveFile: () => null,
			getLeaf: () => ({ openFile: async (file: TFile) => opened.push(file.path) }),
		},
	};
	return {
		doors: standIn<Pick<App, "vault" | "fileManager" | "workspace">>(
			doors,
			["vault", "fileManager", "workspace"],
			"app",
		),
		written,
		opened,
	};
}

const textOfFile = (file: TFile): string => textIn(fieldIn(file, "text"), file.path);

const root: FakeFolder = { path: "/", isRoot: () => true, children: [] };
const rootVault = fakeVault(root);
const first = await createBoardNote(rootVault.doors, undefined);
check("a board in the vault root is created at its bare name", first.path, "Board.md");
check("the created board is opened", rootVault.opened, ["Board.md"]);
const idIn = (text: string): string | null => readId(parseYaml(text.split("---\n")[1] ?? ""));
check(
	"what reached the vault is the note this module writes",
	textOfFile(first),
	boardNoteText(undefined, idIn(textOfFile(first)) ?? undefined),
);

const second = await createBoardNote(rootVault.doors, undefined);
check("a second board steps past the first", second.path, "Board 2.md");
check("and carries an id of its own", idIn(textOfFile(second)) === idIn(textOfFile(first)), false);

const shouty: FakeFolder = { path: "Screens", isRoot: () => false, children: [{ name: "Board.MD" }] };
check(
	"a taken name is seen whatever its case",
	(await createBoardNote(fakeVault(shouty).doors, undefined)).path,
	"Screens/Board 2.md",
);

const chosen: FakeFolder = { path: "Screens", isRoot: () => false, children: [] };
const chosenVault = fakeVault(root);
check(
	"a chosen folder wins over the default one",
	(await createBoardNote(chosenVault.doors, folderOf(chosen))).path,
	"Screens/Board.md",
);

type EditorDoors = Pick<Editor, "getValue" | "getCursor" | "replaceRange" | "setCursor">;

interface FakeEditor extends EditorDoors {
	text(): string;
	readonly cursors: number[];
}

function fakeEditor(text: string, line: number): FakeEditor {
	const lines = text.split("\n");
	const cursors: number[] = [];
	return {
		getValue: () => lines.join("\n"),
		getCursor: () => ({ line, ch: 0 }),
		replaceRange: (written: string, from: EditorPosition) => {
			lines.splice(from.line, 0, ...written.split("\n").slice(0, -1));
		},
		setCursor: (to: EditorPosition | number) => {
			cursors.push(typeof to === "number" ? to : to.line);
		},
		text: () => lines.join("\n"),
		cursors,
	};
}

const editor = fakeEditor("# Notes\n\nSome line\ntail", 2);
insertBoardAtCursor(editor);
check("the editor ends up holding one board", blocksIn(editor.text()).length, 1);
check("the board the editor holds is readable", refusalOf(parseYaml(firstBlockOf(editor.text()))), null);
check("no line of the note was lost", editor.text().includes("Some line") && editor.text().includes("tail"), true);
check("the cursor lands past the board", editor.cursors, [
	3 + present(boardInsertAt("# Notes\n\nSome line\ntail".split("\n"), 2), "the insert").text.split("\n").length - 1,
]);

const atEnd = fakeEditor("only line", 0);
insertBoardAtCursor(atEnd);
check("a cursor on the last line still gets a whole board", blocksIn(atEnd.text()).length, 1);

const unclosed = ["```widgetarium", "v: 1", "tiles: []", "some body text"];
check("a fence nobody closed leaves nowhere safe to insert", boardInsertAt(unclosed, 2), null);
check("and every line of the note is left alone", insertBoardAtCursor(fakeEditor(unclosed.join("\n"), 2)), false);
const wounded = fakeEditor(unclosed.join("\n"), 2);
insertBoardAtCursor(wounded);
check("nothing was written into it", wounded.text(), unclosed.join("\n"));
check(
	"a closed fence is still fine",
	present(boardInsertAt([...unclosed.slice(0, 3), "```", "after"], 1), "the insert").at,
	4,
);

console.log(failed === 0 ? "board-note: all passed" : `board-note: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
