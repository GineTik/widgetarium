import { useRef } from "react";

export function useCloseLadder(look, onDismiss) {
	const { openRow, path } = look.view;
	const ladderRef = useRef(null);
	ladderRef.current = () => {
		if (openRow) return;
		if (path.length === 0) return onDismiss();
		look.put({ path: path.slice(0, -1), tab: "settings", openRow: null, draft: "" });
	};
	return useRef(() => ladderRef.current()).current;
}
