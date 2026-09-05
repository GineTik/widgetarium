import { JSDOM } from "jsdom";
import { buildMirror } from "./mirror.mjs";

const dom = new JSDOM("<!doctype html><body></body>", { pretendToBeVisual: true });
for (const key of ["window", "document", "Node", "Element", "HTMLElement"]) globalThis[key] = key === "window" ? dom.window : dom.window[key];

buildMirror();
const { createViewChrome } = await import("./.mjs-cache/view-chrome.mjs");

let failed = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${label}${ok ? "" : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`}`);
};

function viewAsObsidianBuildsOne(path, { nav = true } = {}) {
	const container = dom.window.document.createElement("div");
	const header = container.appendChild(dom.window.document.createElement("div"));
	header.className = "view-header";
	if (nav) header.appendChild(dom.window.document.createElement("div")).className = "view-header-nav-buttons";
	const actions = header.appendChild(dom.window.document.createElement("div"));
	actions.className = "view-actions";
	actions.appendChild(dom.window.document.createElement("button")).className = "clickable-icon view-action mod-more";
	return {
		containerEl: container,
		file: path ? { path } : null,
		addAction(icon, title, callback) {
			const button = dom.window.document.createElement("button");
			button.className = "clickable-icon view-action";
			button.dataset.icon = icon;
			button.setAttribute("aria-label", title);
			button.addEventListener("click", callback);
			actions.prepend(button);
			return button;
		},
	};
}

const navOf = (view) => [...view.containerEl.querySelectorAll(".view-header-nav-buttons > button")];
const actionsOf = (view) => [...view.containerEl.querySelectorAll(".view-actions > button")];
const iconsOf = (view) => [...navOf(view), ...actionsOf(view)].map((node) => node.dataset.icon ?? "core");

console.log("— the header carries one button per foldable sidebar, and only where a board has one —");

const board = new Map();
const pressed = [];
let leaves = [];
const chrome = createViewChrome({
	workspace: { getLeavesOfType: () => leaves },
	regionsFor: (path) => board.get(path) ?? [],
	onToggle: (path, name) => pressed.push([path, name]),
});

const withBoard = viewAsObsidianBuildsOne("Boards/Orbitask.md");
const bare = viewAsObsidianBuildsOne("Notes/Plain.md");
leaves = [{ view: withBoard }, { view: bare }];
board.set("Boards/Orbitask.md", [
	{ name: "left", folded: false },
	{ name: "right", folded: true },
]);

chrome.sync();
check("the left button lands beside the arrows", navOf(withBoard).map((node) => node.dataset.icon), ["sidebar-left"]);
check("the right button lands ahead of what the header already had", actionsOf(withBoard).map((node) => node.dataset.icon ?? "core"), ["sidebar-right", "core"]);
check("a note with no board is left alone", iconsOf(bare), ["core"]);
check("the open side says it can be hidden", navOf(withBoard)[0].getAttribute("aria-label"), "Widgetarium: hide the left sidebar");
check("the folded side says it can be shown", actionsOf(withBoard)[0].getAttribute("aria-label"), "Widgetarium: show the right sidebar");
check("both wear the class the stylesheet paints", [navOf(withBoard)[0].classList.contains("wg-view-action"), actionsOf(withBoard)[0].classList.contains("wg-view-action")], [true, true]);
check("and only the open one is marked active", [navOf(withBoard)[0].classList.contains("is-active"), actionsOf(withBoard)[0].classList.contains("is-active")], [true, false]);

navOf(withBoard)[0].dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
actionsOf(withBoard)[0].dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
check("each button names the note it belongs to and the side it holds", pressed, [
	["Boards/Orbitask.md", "left"],
	["Boards/Orbitask.md", "right"],
]);

chrome.sync();
check("syncing again does not pile up a second pair", iconsOf(withBoard), ["sidebar-left", "sidebar-right", "core"]);

board.set("Boards/Orbitask.md", [{ name: "left", folded: true }]);
chrome.sync();
check("a sidebar the board no longer has loses its button", iconsOf(withBoard), ["sidebar-left", "core"]);
check("and the one that stayed follows the fold", [navOf(withBoard)[0].getAttribute("aria-label"), navOf(withBoard)[0].classList.contains("is-active")], ["Widgetarium: show the left sidebar", false]);

leaves = [{ view: bare }];
chrome.sync();
check("a view that left the workspace takes its buttons with it", iconsOf(withBoard), ["core"]);

const noNav = viewAsObsidianBuildsOne("Boards/Orbitask.md", { nav: false });
leaves = [{ view: noNav }];
board.set("Boards/Orbitask.md", [
	{ name: "left", folded: false },
	{ name: "right", folded: false },
]);
chrome.sync();
check("a header with no nav group still gets the side that has an API", iconsOf(noNav), ["sidebar-right", "core"]);

leaves = [{ view: withBoard }, { view: bare }, { view: noNav }];
chrome.sync();
chrome.stop();
check("unloading the plugin leaves the header as it found it", iconsOf(withBoard), ["core"]);
check("and nothing was left behind in the other views either", [iconsOf(bare), iconsOf(noNav)], [["core"], ["core"]]);

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
