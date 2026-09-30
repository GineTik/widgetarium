import { useRef } from "react";
import type { SettingsLook } from "./use-settings-look.js";

type Step = () => void;

export function useCloseLadder(look: SettingsLook, onDismiss: () => void): Step {
	const { openRow, path } = look.view;
	const ladderRef = useRef<Step>(() => {});
	ladderRef.current = () => {
		if (openRow) return;
		if (path.length === 0) {
			onDismiss();
			return;
		}
		look.put({ path: path.slice(0, -1), tab: "settings", openRow: null, draft: "" });
	};
	return useRef<Step>(() => ladderRef.current()).current;
}
