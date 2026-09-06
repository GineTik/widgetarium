import { parse as parseYaml } from "yaml";
import { buildMirror } from "./mirror.mjs";

buildMirror();
const { boardBlock, boardNoteText, boardPathIn, boardInsertAt, isScreenNote, createBoardNote, insertBoardAtCursor } = await import("./.mjs-cache/board-note.mjs");
const { findBlocks } = await import("./.mjs-cache/block-writer.mjs");
const { normalizeBoard } = await import("./.mjs-cache/model.mjs");
const { blockRefusal, BLOCK_FORMAT } = await import("./.mjs-cache/version.mjs");

let failed = 0;
function check(name, got, want) {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
}

function blocksIn(text) {
	const lines = text.split("\n");
	return findBlocks(lines).map((block) => lines.slice(block.start + 1, block.end).join("\n"));
}

const note = boardNoteText();
const frontmatter = parseYaml(note.split("---\n")[1] ?? "");

check("a created note reads as a screen", isScreenNote(frontmatter), true);
check("a note without the mark is no screen", isScreenNote({ widgetarium: { wgId: "u1" } }), false);
check("the note holds exactly one board", blocksIn(note).length, 1);

const parsed = parseYaml(blocksIn(note)[0]);
check("the board is written in the format this plugin reads", blockRefusal(parsed), null);
check("the board declares the current format", parsed.v, BLOCK_FORMAT);
check("the board opens with no tiles", normalizeBoard(parsed).tiles.length, 0);
check("a new board is a tree, never a grid", "layouts" in parsed, false);
check("and it is born with all three regions, so the first widget has somewhere to go", Object.keys(parsed.layout), ["left", "main", "right"]);
check("every one of them starts empty", Object.values(parsed.layout), [[], [], []]);
check("the tree survives being read back", Object.keys(normalizeBoard(parsed).layout), ["left", "main", "right"]);
check("the board authors no grid layout", Object.keys(normalizeBoard(parsed).layouts), []);

check("the first board takes the plain name", boardPathIn("Screens", []), "Screens/Board.md");
check("a taken name is stepped past", boardPathIn("Screens", ["Board", "Board 2"]), "Screens/Board 3.md");
check("the vault root carries no leading slash", boardPathIn("", ["Board"]), "Board 2.md");
check("a name taken in another case is still taken", boardPathIn("Screens", ["board"]), "Screens/Board 2.md");

const held = ["# Notes", "", "Some line", "tail"];
check("a blank line takes the board itself", boardInsertAt(held, 1).at, 1);
check("a written line pushes the board under it", boardInsertAt(held, 2).at, 3);
check("a board landing under text is preceded by a blank line", boardInsertAt(held, 2).text.startsWith("\n"), true);
check("a board landing above text is followed by a blank line", boardInsertAt(held, 2).text.endsWith("\n\n"), true);
check("the first line of the note needs no lead", boardInsertAt(["", "text"], 0).text.startsWith("`"), true);

function inserted(lines, cursorLine) {
	const { at, text } = boardInsertAt(lines, cursorLine);
	const whole = lines.join("\n");
	const before = whole.split("\n").slice(0, at).join("\n");
	const after = whole.split("\n").slice(at).join("\n");
	return `${before}${at > 0 ? "\n" : ""}${text}${after}`;
}

check("inserting into a bare note leaves one board", blocksIn(inserted(held, 2)).length, 1);

const beside = `${note}Tail`.split("\n");
check("inserting after a board leaves two", blocksIn(inserted(beside, beside.length - 1)).length, 2);
const insideBlock = beside.findIndex((line) => line.trim() === "main: []");
check("the cursor inside a board is a line of that board", insideBlock > 0, true);
check("inserting from inside a board does not nest one in the other", blocksIn(inserted(beside, insideBlock)).length, 2);
check("and the board the cursor sat in is left whole", blockRefusal(parseYaml(blocksIn(inserted(beside, insideBlock))[0])), null);
check("an inserted board is still readable", blockRefusal(parseYaml(blocksIn(inserted(held, 2))[0])), null);
check("a created board opens as a page, because the note is the board", parsed.mode, "expanded");
check("one dropped into somebody's prose takes no screen", parseYaml(blocksIn(inserted(held, 2))[0]).mode, undefined);
check("and is otherwise the very board a created note holds", blocksIn(inserted(held, 2))[0], blocksIn(note)[0].split("\nmode: expanded").join(""));
check("the block is fenced as widgetarium", boardBlock().split("\n")[0], "```widgetarium");

function fakeCreate(folder, written) {
	return async (path, text) => {
		if (written.some((file) => file.path.toLowerCase() === path.toLowerCase())) throw new Error(`File already exists: ${path}`);
		const file = { path, text, name: path.split("/").pop() };
		written.push(file);
		folder.children.push(file);
		return file;
	};
}

function fakeVault(folder) {
	const written = [];
	const opened = [];
	const doors = {
		vault: { create: fakeCreate(folder, written) },
		fileManager: { getNewFileParent: () => folder },
		workspace: { getActiveFile: () => null, getLeaf: () => ({ openFile: async (file) => opened.push(file.path) }) },
	};
	return { doors, written, opened };
}

const root = { path: "/", isRoot: () => true, children: [] };
const rootVault = fakeVault(root);
const first = await createBoardNote(rootVault.doors);
check("a board in the vault root is created at its bare name", first.path, "Board.md");
check("the created board is opened", rootVault.opened, ["Board.md"]);
check("what reached the vault is the note this module writes", first.text, note);

const second = await createBoardNote(rootVault.doors);
check("a second board steps past the first", second.path, "Board 2.md");

const shouty = { path: "Screens", isRoot: () => false, children: [{ name: "Board.MD" }] };
check("a taken name is seen whatever its case", (await createBoardNote(fakeVault(shouty).doors)).path, "Screens/Board 2.md");

const chosen = { path: "Screens", isRoot: () => false, children: [] };
const chosenVault = fakeVault(root);
check("a chosen folder wins over the default one", (await createBoardNote(chosenVault.doors, chosen)).path, "Screens/Board.md");

function fakeEditor(text, line) {
	const lines = text.split("\n");
	const cursors = [];
	return {
		getValue: () => lines.join("\n"),
		getCursor: () => ({ line, ch: 0 }),
		replaceRange: (written, from) => lines.splice(from.line, 0, ...written.split("\n").slice(0, -1)),
		setCursor: (to) => cursors.push(to.line),
		text: () => lines.join("\n"),
		cursors,
	};
}

const editor = fakeEditor("# Notes\n\nSome line\ntail", 2);
insertBoardAtCursor(editor);
check("the editor ends up holding one board", blocksIn(editor.text()).length, 1);
check("the board the editor holds is readable", blockRefusal(parseYaml(blocksIn(editor.text())[0])), null);
check("no line of the note was lost", editor.text().includes("Some line") && editor.text().includes("tail"), true);
check("the cursor lands past the board", editor.cursors, [3 + boardInsertAt("# Notes\n\nSome line\ntail".split("\n"), 2).text.split("\n").length - 1]);

const atEnd = fakeEditor("only line", 0);
insertBoardAtCursor(atEnd);
check("a cursor on the last line still gets a whole board", blocksIn(atEnd.text()).length, 1);

const unclosed = ["```widgetarium", "v: 1", "tiles: []", "some body text"];
check("a fence nobody closed leaves nowhere safe to insert", boardInsertAt(unclosed, 2), null);
check("and every line of the note is left alone", insertBoardAtCursor(fakeEditor(unclosed.join("\n"), 2)), false);
const wounded = fakeEditor(unclosed.join("\n"), 2);
insertBoardAtCursor(wounded);
check("nothing was written into it", wounded.text(), unclosed.join("\n"));
check("a closed fence is still fine", boardInsertAt([...unclosed.slice(0, 3), "```", "after"], 1).at, 4);

console.log(failed === 0 ? "board-note: all passed" : `board-note: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
