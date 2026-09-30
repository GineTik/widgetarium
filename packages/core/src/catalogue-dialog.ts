import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { render } from "./engine/render.js";
import { Catalogue } from "./catalogue.js";
import type { CatalogueProps } from "./catalogue.js";
import { DialogClose, DialogContent, DialogFooter, DialogOverlay } from "./dialog.js";
import { NO_CATALOGUE } from "./engine/catalogue-none.js";
import type { WidgetCatalogue } from "./gateway/host.js";
import type { WidgetLookup } from "./registry.js";
import type { CatalogueHost } from "./catalogue-preview.js";
import type { CatalogueMode } from "./catalogue-install-press.js";

export interface CatalogueDialogProps extends CatalogueProps {
	readonly foot?: ReactNode;
	readonly onClose: () => void;
}

type OpenCatalogueOptions = Omit<CatalogueDialogProps, "onClose"> & {
	readonly onClose?: (() => void) | undefined;
};

interface OpenedCatalogue {
	readonly close: () => void;
	readonly redraw: (fresh: Partial<OpenCatalogueOptions>) => void;
}

type AskedCatalogue = Parameters<WidgetCatalogue["open"]>[0];

const CATALOGUE_MODES: readonly CatalogueMode[] = ["browse", "place", "fill", "text", "mount", "template"];

export function CatalogueDialog(props: CatalogueDialogProps): ReactElement {
	const { foot, onClose, ...shown } = props;
	return h(
		DialogOverlay,
		{ className: "wg-cat-over", onClose },
		h(DialogContent, { className: "wg-cat-dialog" }, [
			h(DialogClose, { key: "close", onClose }),
			h(Catalogue, { key: "grid", ...shown }),
			foot ? h(DialogFooter, { key: "foot" }, foot) : null,
		]),
	);
}

export function widgetCatalogue(registry: WidgetLookup, host: CatalogueHost | null | undefined): WidgetCatalogue {
	if (host?.can?.catalogue === false) return NO_CATALOGUE;
	return {
		canOpen: true,
		open: (options) => pickWidget(registry, host, options),
	};
}

export function openCatalogue(options: OpenCatalogueOptions): OpenedCatalogue {
	const node = document.createElement("div");
	let shown = options;
	const close = (): void => {
		render(null, node);
		shown.onClose?.();
	};
	const draw = (): void => render(h(CatalogueDialog, { ...shown, onClose: close }), node);
	draw();
	return {
		close,
		redraw: (fresh) => {
			shown = { ...shown, ...fresh };
			draw();
		},
	};
}

function pickWidget(
	registry: WidgetLookup,
	host: CatalogueHost | null | undefined,
	options: AskedCatalogue = {},
): Promise<string | null> {
	return new Promise((resolve) => {
		let picked: string | null = null;
		const { close } = openCatalogue({
			registry,
			host,
			mode: modeAsked(options.mode),
			kind: options.kind === "inline" ? "inline" : "board",
			onPick: (id) => {
				picked = id;
				close();
			},
			onClose: () => resolve(picked),
		});
	});
}

function modeAsked(asked: string | undefined): CatalogueMode {
	const mode = asked ?? "mount";
	return CATALOGUE_MODES.find((known) => known === mode) ?? "browse";
}
