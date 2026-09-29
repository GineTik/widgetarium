import { useEffect, useMemo } from "react";
import { useCellValue } from "./use-cell-value.js";

export function useOpenCell(shared, openKey) {
	const cell = useMemo(() => shared.cellFor(openKey), [shared, openKey]);
	const isOpen = useCellValue(cell) === true;
	useEffect(() => () => void cell.update(false), [cell]);
	return { cell, isOpen };
}
