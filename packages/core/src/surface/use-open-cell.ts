import { useEffect, useMemo } from "react";
import type { ViewCell } from "../gateway/refs.js";
import { useCellValue } from "./use-cell-value.js";
import type { SurfaceShared } from "./use-surface-shared.js";

interface OpenCell {
	readonly cell: ViewCell;
	readonly isOpen: boolean;
}

export function useOpenCell(shared: Pick<SurfaceShared, "cellFor">, openKey: string): OpenCell {
	const cell = useMemo(() => shared.cellFor(openKey), [shared, openKey]);
	const isOpen = useCellValue(cell) === true;
	useEffect(() => () => void cell.update(false), [cell]);
	return { cell, isOpen };
}
