import { h, render } from "preact";
import { Catalogue } from "./catalogue.js";
import { DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogTitle } from "./dialog.js";

// CONTEXT: one surface, three entry points — the mode is what the press means, and the words above
// the grid are the only other thing that changes with it
const SAID = {
	browse: { title: "Widgets", lead: "Every widget installed in this vault, drawn as it really looks" },
	place: { title: "Add a widget", lead: "Pick one and it lands on this board" },
	fill: { title: "Fill this slot", lead: "Pick the widget this slot draws for every row" },
};

export function CatalogueDialog({ registry, host, mode = "browse", rank, foot, onPick, onClose }) {
	const said = SAID[mode] ?? SAID.browse;
	return h(
		DialogOverlay,
		{ class: "wg-cat-over", onClose },
		h(DialogContent, { class: "wg-cat-dialog" }, [
			h(DialogHeader, { key: "head" }, [
				h(DialogTitle, { key: "title" }, said.title),
				h(DialogDescription, { key: "lead" }, said.lead),
			]),
			h(DialogClose, { key: "close", onClose }),
			h(Catalogue, { key: "grid", registry, host, mode, rank, onPick }),
			foot ? h(DialogFooter, { key: "foot" }, foot) : null,
		]),
	);
}

// CONTEXT: the command palette has no preact tree to hang this on, so the surface brings its own —
// a holder that is never attached, because the dialog portals its overlay onto <body> by itself
export function openCatalogue(options) {
	const node = document.createElement("div");
	const close = () => {
		render(null, node);
		options.onClose?.();
	};
	render(h(CatalogueDialog, { ...options, onClose: close }), node);
	return close;
}
