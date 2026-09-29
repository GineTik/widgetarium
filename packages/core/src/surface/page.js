import { useDrawsInPane } from "./use-draws-in-pane.js";

const PANE_SELECTOR = ".view-content";

export function Page({ boardNode, children }) {
	const pane = boardNode?.closest(PANE_SELECTOR);
	useDrawsInPane(pane, children);
	return pane ? null : children;
}
