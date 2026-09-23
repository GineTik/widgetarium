import { createElement as h } from "react";
import { render } from "./engine/render.js";
import { Catalogue } from "./catalogue.js";
import { DialogClose, DialogContent, DialogFooter, DialogOverlay } from "./dialog.js";
import { NO_CATALOGUE } from "./engine/catalogue-none.js";

export function CatalogueDialog({
	registry,
	host,
	mode = "browse",
	kind = "board",
	available,
	templates,
	rank,
	lock,
	foot,
	onPick,
	onInstall,
	onUninstall,
	onUseTemplate,
	onClose,
}) {
	return h(
		DialogOverlay,
		{ className: "wg-cat-over", onClose },
		h(DialogContent, { className: "wg-cat-dialog" }, [
			h(DialogClose, { key: "close", onClose }),
			h(Catalogue, {
				key: "grid",
				registry,
				host,
				mode,
				kind,
				available,
				templates,
				rank,
				lock,
				onPick,
				onInstall,
				onUninstall,
				onUseTemplate,
			}),
			foot ? h(DialogFooter, { key: "foot" }, foot) : null,
		]),
	);
}

// CONTEXT: a widget may ask for a widget, and only the board holds the registry to ask with
export function widgetCatalogue(registry, host) {
	if (host?.can?.catalogue === false) return NO_CATALOGUE;
	return {
		canOpen: true,
		open: (options) => pickWidget(registry, host, options),
	};
}

function pickWidget(registry, host, options = {}) {
	return new Promise((resolve) => {
		// CONTEXT: closing is what settles it — a pick closes, and closing unpicked answers null
		let picked = null;
		const { close } = openCatalogue({
			registry,
			host,
			mode: options.mode ?? "mount",
			kind: options.kind ?? "board",
			onPick: (id) => {
				picked = id;
				close();
			},
			onClose: () => resolve(picked),
		});
	});
}

// CONTEXT: the command palette has no preact tree to hang this on, so the surface brings its own —
// a holder that is never attached, because the dialog portals its overlay onto <body> by itself
export function openCatalogue(options) {
	const node = document.createElement("div");
	let shown = options;
	const close = () => {
		render(null, node);
		shown.onClose?.();
	};
	const draw = () => render(h(CatalogueDialog, { ...shown, onClose: close }), node);
	draw();
	return {
		close,
		redraw: (fresh) => {
			shown = { ...shown, ...fresh };
			draw();
		},
	};
}
