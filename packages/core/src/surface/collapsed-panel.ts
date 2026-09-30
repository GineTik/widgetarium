import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { RegionDrawer } from "../drawer.js";
import type { PressAt } from "../drawer.js";
import { DRAWER } from "../tree.js";
import type { CollapseKind } from "../tree-nodes.js";
import { useOpenCell } from "./use-open-cell.js";
import type { SurfaceShared } from "./use-surface-shared.js";

export type PressAtKey = (openKey: string) => PressAt | null | undefined;

export interface CollapsedPanelProps {
	readonly openKey: string;
	readonly look: string;
	readonly width: number;
	readonly shared: Pick<SurfaceShared, "cellFor">;
	readonly pressAt: PressAtKey;
	readonly children?: ReactNode;
}

export function CollapsedPanel({ openKey, look, width, shared, pressAt, children }: CollapsedPanelProps): ReactElement {
	const { cell, isOpen } = useOpenCell(shared, openKey);
	return h(
		RegionDrawer,
		{ name: look, isOpen, pressAt: isOpen ? pressAt(openKey) : null, width, onClose: () => cell.update(false) },
		children,
	);
}

export function lookOf(into: CollapseKind, side: string): string {
	return into === DRAWER ? side : into;
}
