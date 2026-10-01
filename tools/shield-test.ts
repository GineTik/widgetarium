import { JSDOM } from "jsdom";
import { byId } from "./dom-find.ts";

const dom = new JSDOM("<!doctype html><div id=editor><div id=block></div></div>");
Object.assign(globalThis, { window: dom.window, document: dom.window.document, Node: dom.window.Node });

const { shieldFromEditor } = await import("../packages/core/src/editor-shield.js");

const editor = byId(document, "editor");
const block = byId(document, "block");
block.innerHTML = "<input id=field><button id=go>Add</button>";

const seen = { editorKeys: 0, editorClicks: 0, fieldKeys: 0, buttonClicks: 0 };
editor.addEventListener("keydown", () => (seen.editorKeys += 1));
editor.addEventListener("click", () => (seen.editorClicks += 1));
byId(document, "field").addEventListener("keydown", () => (seen.fieldKeys += 1));
byId(document, "go").addEventListener("click", () => (seen.buttonClicks += 1));

shieldFromEditor(block);

const key = (target: EventTarget, k: string): boolean =>
	target.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: k, bubbles: true }));
const click = (target: EventTarget): boolean =>
	target.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));

key(byId(document, "field"), "a");
click(byId(document, "go"));

let failures = 0;
const check = (label: string, got: unknown, want: unknown): void => {
	const ok = got === want;
	if (!ok) failures += 1;
	console.log(`${ok ? "OK " : "!! "} ${label} — ${got}${ok ? "" : ` (expected ${want})`}`);
};

check("typing reaches the field", seen.fieldKeys, 1);
check("typing does NOT reach the editor", seen.editorKeys, 0);
check("click reaches the button", seen.buttonClicks, 1);
check("click does NOT reach the editor", seen.editorClicks, 0);
check("block is not editable text", block.getAttribute("contenteditable"), "false");

key(byId(document, "field"), "Escape");
check("Escape still reaches the editor", seen.editorKeys, 1);

console.log(failures === 0 ? "\nshield holds" : `\n${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
