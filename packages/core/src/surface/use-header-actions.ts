import { useEffect } from "react";
import type { BoxAction } from "./box-actions.js";

export type OnActions = (actions: readonly BoxAction[]) => void;

export function useHeaderActions(actions: readonly BoxAction[], onActions: OnActions | null | undefined): void {
	useEffect(() => {
		onActions?.(actions);
	});
	useEffect(() => () => onActions?.([]), []);
}
