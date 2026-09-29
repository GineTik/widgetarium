import { createElement as h } from "react";
import { RegionDrawer } from "../drawer.js";
import { DRAWER } from "../tree.js";
import { useOpenCell } from "./use-open-cell.js";

export function CollapsedPanel({ openKey, look, width, shared, pressAt, children }) {
	const { cell, isOpen } = useOpenCell(shared, openKey);
	return h(
		RegionDrawer,
		{ name: look, isOpen, pressAt: isOpen ? pressAt(openKey) : null, width, onClose: () => cell.update(false) },
		children,
	);
}

export function lookOf(into, side) {
	return into === DRAWER ? side : into;
}
