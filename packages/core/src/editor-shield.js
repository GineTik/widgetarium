// In Live Preview the block is rendered INSIDE CodeMirror, which owns the keyboard and
// re-places the caret on every click. Without this a widget looks alive and is not: a button
// swallows its click, and an input can never be typed into because the editor takes the key
// before it lands. `contenteditable=false` tells CM the subtree is not text; the listeners
// run in the BUBBLE phase, so the widget's own handler has already fired by the time we stop
// the event from reaching the editor above us.
const SHIELDED_EVENTS = [
	"keydown",
	"keypress",
	"keyup",
	"mousedown",
	"pointerdown",
	"click",
	"dblclick",
	"paste",
	"input",
	"beforeinput",
];

export function shieldFromEditor(element) {
	if (element.dataset.wgShielded === "1") return;
	element.dataset.wgShielded = "1";
	element.setAttribute("contenteditable", "false");
	element.setAttribute("tabindex", "-1");

	for (const name of SHIELDED_EVENTS) {
		element.addEventListener(name, (event) => {
			// Escape belongs to the app: it closes the modal, it is not a widget's to keep.
			if (event.key === "Escape") return;
			event.stopPropagation();
		});
	}
}
