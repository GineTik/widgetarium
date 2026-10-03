import { MarkdownView } from "obsidian";
import type { WorkspaceLeaf } from "obsidian";
import { receiveDrops } from "@widgetarium/core/surface/drop-receivers.js";
import type { DropReceiver, PlaceAt } from "@widgetarium/core/surface/drop-receivers.js";
import type { PointerAt } from "@widgetarium/core/surface/carry.js";
import { boardInsertAt } from "./board-note.js";
import { placedWidgetBoard } from "./catalogue-boards.js";
import type WidgetariumPlugin from "./main.js";

const AIMED_CLASS = "wg-note-drop";
const NO_EDITOR_VIEW =
	"Widgetarium: this editor exposes no CodeMirror view, so a widget dropped into it lands at the end of the note";
const FENCE_LEFT_OPEN = "Widgetarium: {widget} was not placed — this note has a code fence that was never closed";

interface HasPosAtCoords {
	posAtCoords(at: { x: number; y: number }): unknown;
}

let lastNoteNumber = 0;
let isEditorViewMissingTold = false;

export function receiveDropsInNotes(plugin: WidgetariumPlugin): void {
	const held = new Map<WorkspaceLeaf, () => void>();
	const sync = (): void => syncNoteReceivers(held, plugin.app.workspace.getLeavesOfType("markdown"));
	plugin.app.workspace.onLayoutReady(sync);
	plugin.registerEvent(plugin.app.workspace.on("layout-change", sync));
	plugin.register(() => syncNoteReceivers(held, []));
}

function syncNoteReceivers(held: Map<WorkspaceLeaf, () => void>, leaves: readonly WorkspaceLeaf[]): void {
	for (const [leaf, stop] of held) {
		if (leaves.includes(leaf)) continue;
		stop();
		held.delete(leaf);
	}
	for (const leaf of leaves) {
		if (!held.has(leaf) && leaf.view instanceof MarkdownView) held.set(leaf, receiveDrops(noteReceiver(leaf.view)));
	}
}

function noteReceiver(view: MarkdownView): DropReceiver {
	const id = `note-${(lastNoteNumber += 1)}`;
	return {
		id,
		element: view.containerEl,
		aim: (pointer) => aimInNote(view, id, pointer),
		rest: () => view.containerEl.removeClass(AIMED_CLASS),
		place: (widget, at) => {
			view.containerEl.removeClass(AIMED_CLASS);
			return at.kind === "note" && insertPlacedBoard(view, widget, at.line);
		},
	};
}

function aimInNote(view: MarkdownView, id: string, pointer: PointerAt): PlaceAt | null {
	if (!view.file) return null;
	view.containerEl.addClass(AIMED_CLASS);
	const line = lineAt(view, pointer.clientX, pointer.clientY);
	if (view.getMode() === "source") view.editor.setCursor({ line, ch: 0 });
	return { kind: "note", note: id, line };
}

function insertPlacedBoard(view: MarkdownView, widget: string, line: number): boolean {
	const editor = view.editor;
	const insertion = boardInsertAt(editor.getValue().split("\n"), line, placedWidgetBoard(widget));
	if (!insertion) {
		console.warn(FENCE_LEFT_OPEN.replace("{widget}", widget));
		return false;
	}
	editor.replaceRange(insertion.text, { line: insertion.at, ch: 0 });
	return true;
}

function lineAt(view: MarkdownView, x: number, y: number): number {
	const last = Math.max(0, view.editor.lineCount() - 1);
	if (view.getMode() !== "source") return last;
	const editorView: unknown = Reflect.get(view.editor, "cm");
	if (!isPositioned(editorView)) return tellEditorViewMissing(last);
	const offset = editorView.posAtCoords({ x, y });
	return typeof offset === "number" ? view.editor.offsetToPos(offset).line : last;
}

function isPositioned(held: unknown): held is HasPosAtCoords {
	return typeof held === "object" && held !== null && typeof Reflect.get(held, "posAtCoords") === "function";
}

function tellEditorViewMissing(last: number): number {
	if (!isEditorViewMissingTold) console.warn(NO_EDITOR_VIEW);
	isEditorViewMissingTold = true;
	return last;
}
