import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, Segmented } from "@widgetarium/kit";
import { AddPhoto } from "./design-add-photo.js";
import { Tip } from "./design-tip.js";

export type CanvasMode = "pointer" | "hand";

export interface CanvasToolsProps {
	readonly mode: CanvasMode;
	readonly onMode: (mode: CanvasMode) => void;
	readonly onAddPhotos: (photos: readonly File[]) => void;
}

const MODES: readonly { readonly value: CanvasMode; readonly icon: string; readonly said: string }[] = [
	{ value: "pointer", icon: "mouse-pointer-2", said: "Select: point at a part of a page to pick it" },
	{ value: "hand", icon: "hand", said: "Hand: drag to move around the canvas" },
];

export function CanvasTools({ mode, onMode, onAddPhotos }: CanvasToolsProps): ReactElement {
	return h("div", { className: "wg-design-tools" }, [
		h(AddPhoto, { key: "add", onAddPhotos }),
		h(Segmented<CanvasMode>, {
			key: "mode",
			items: MODES.map((one) => ({
				value: one.value,
				label: h(Tip, { label: one.said }, h(Icon, { name: one.icon, size: 16 })),
			})),
			value: mode,
			onValueChange: onMode,
			size: "s",
			className: "wg-design-modes",
		}),
	]);
}
