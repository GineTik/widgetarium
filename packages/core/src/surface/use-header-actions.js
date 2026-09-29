import { useEffect } from "react";

export function useHeaderActions(actions, onActions) {
	useEffect(() => {
		onActions?.(actions);
	});
	useEffect(() => () => onActions?.([]), []);
}
