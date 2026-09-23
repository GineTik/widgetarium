import { stringifyYaml } from "obsidian";
import { normalizeBoard, serializeBoard, uniqueName } from "@widgetarium/core/model.js";
import { BLOCK_LANGUAGE, FENCE, findBlocks, unclosedBlockIn } from "@widgetarium/core/block-writer.js";
import { markOf, withMark } from "@widgetarium/core/note-mark.js";
import { mintId, withId } from "@widgetarium/core/record-id.js";

const SCREEN_KIND = "screen";
const BOARD_NAME = "Board";

function isBlank(line) {
	return String(line ?? "").trim() === "";
}

export function isScreenNote(frontmatter) {
	return markOf(frontmatter).kind === SCREEN_KIND;
}

const EMPTY_BOARD = { tiles: [] };

// TRADE-OFF: a note whose whole point is the board opens as a page; a board dropped into somebody's prose is a block in it, and takes no screen
const SCREEN_BOARD = { ...EMPTY_BOARD, mode: "expanded" };

export function boardBlock(board = EMPTY_BOARD) {
	const body = stringifyYaml(serializeBoard(normalizeBoard(board))).trimEnd();
	return `${FENCE}${BLOCK_LANGUAGE}\n${body}\n${FENCE}`;
}

export function boardNoteText(board = SCREEN_BOARD, id = mintId()) {
	const marked = withId(withMark({}, { kind: SCREEN_KIND }), id);
	return `---\n${stringifyYaml(marked).trimEnd()}\n---\n\n${boardBlock(board)}\n`;
}

function caseBlindSet(names) {
	const held = new Set(names.map((name) => name.toLowerCase()));
	return { has: (name) => held.has(name.toLowerCase()), add: (name) => held.add(name.toLowerCase()) };
}

export function boardPathIn(folderPath, taken, wanted = BOARD_NAME) {
	const name = uniqueName(caseBlindSet(taken), wanted);
	return folderPath ? `${folderPath}/${name}.md` : `${name}.md`;
}

// TRADE-OFF: an unclosed fence is refused rather than repaired — a board written into one closes it and swallows itself
export function insertLineFor(lines, cursorLine) {
	if (unclosedBlockIn(lines) >= 0) return null;
	const inside = findBlocks(lines).find((block) => cursorLine >= block.start && cursorLine <= block.end);
	if (inside) return inside.end + 1;
	return isBlank(lines[cursorLine]) ? cursorLine : cursorLine + 1;
}

export function boardInsertAt(lines, cursorLine) {
	const at = insertLineFor(lines, cursorLine);
	if (at === null) return null;
	const lead = isBlank(lines[at - 1]) ? "" : "\n";
	const tail = isBlank(lines[at]) ? "" : "\n";
	return { at, text: `${lead}${boardBlock()}\n${tail}` };
}

function takenNamesIn(folder) {
	return (folder?.children ?? []).map((child) => String(child.name ?? "").replace(/\.md$/i, ""));
}

function folderPathOf(folder) {
	if (!folder || folder.isRoot?.()) return "";
	return folder.path ?? "";
}

export async function createBoardNote({ vault, fileManager, workspace }, folder, wanted = {}) {
	const parent = folder ?? fileManager.getNewFileParent(workspace.getActiveFile()?.path ?? "");
	const path = boardPathIn(folderPathOf(parent), takenNamesIn(parent), wanted.name);
	const file = await vault.create(path, boardNoteText(wanted.board));
	await workspace.getLeaf(false).openFile(file);
	return file;
}

export function insertBoardAtCursor(editor) {
	const placed = boardInsertAt(editor.getValue().split("\n"), editor.getCursor().line);
	if (!placed) return false;
	editor.replaceRange(placed.text, { line: placed.at, ch: 0 });
	editor.setCursor({ line: placed.at + placed.text.split("\n").length - 1, ch: 0 });
	return true;
}
