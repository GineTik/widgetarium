import { JSDOM } from "jsdom";
import { buildMirror } from "./mirror.mjs";

buildMirror();

const dom = new JSDOM("<!doctype html><div id=editor><div id=block></div></div>");
global.window = dom.window;
global.document = dom.window.document;
global.Node = dom.window.Node;

const { shieldFromEditor } = await import("./.mjs-cache/editor-shield.mjs");

const editor = document.getElementById("editor");
const block = document.getElementById("block");
block.innerHTML = "<input id=field><button id=go>Add</button>";

const seen = { editorKeys: 0, editorClicks: 0, fieldKeys: 0, buttonClicks: 0 };
editor.addEventListener("keydown", () => (seen.editorKeys += 1));
editor.addEventListener("click", () => (seen.editorClicks += 1));
document.getElementById("field").addEventListener("keydown", () => (seen.fieldKeys += 1));
document.getElementById("go").addEventListener("click", () => (seen.buttonClicks += 1));

shieldFromEditor(block);

const key = (target, k) => target.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: k, bubbles: true }));
const click = (target) => target.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));

key(document.getElementById("field"), "a");
click(document.getElementById("go"));

let failures = 0;
const check = (label, got, want) => {
	const ok = got === want;
	if (!ok) failures += 1;
	console.log(`${ok ? "OK " : "!! "} ${label} — ${got}${ok ? "" : ` (expected ${want})`}`);
};

check("typing reaches the field", seen.fieldKeys, 1);
check("typing does NOT reach the editor", seen.editorKeys, 0);
check("click reaches the button", seen.buttonClicks, 1);
check("click does NOT reach the editor", seen.editorClicks, 0);
check("block is not editable text", block.getAttribute("contenteditable"), "false");

// Escape must stay the app's: it closes the modal, it does not belong to a widget
key(document.getElementById("field"), "Escape");
check("Escape still reaches the editor", seen.editorKeys, 1);

console.log(failures === 0 ? "\nshield holds" : `\n${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
