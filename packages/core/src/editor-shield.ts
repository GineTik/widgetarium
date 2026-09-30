const EVENTS_THE_EDITOR_WOULD_TAKE = [
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

export function shieldFromEditor(element: HTMLElement): void {
	if (element.dataset["wgShielded"] === "1") return;
	element.dataset["wgShielded"] = "1";
	element.setAttribute("contenteditable", "false");
	element.setAttribute("tabindex", "-1");

	for (const name of EVENTS_THE_EDITOR_WOULD_TAKE) element.addEventListener(name, stopAllButEscapeBubbling);
}

function stopAllButEscapeBubbling(event: Event): void {
	if (Reflect.get(event, "key") === "Escape") return;
	event.stopPropagation();
}
