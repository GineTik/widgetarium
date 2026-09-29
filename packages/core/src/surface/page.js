import { useDrawnInPane } from "./use-drawn-in-pane.js";

const PANE_SELECTOR = ".view-content";

export function Page({ boardNode, children }) {
	const pane = boardNode?.closest(PANE_SELECTOR);
	useDrawnInPane(pane, children);
	return pane ? null : children;
}
