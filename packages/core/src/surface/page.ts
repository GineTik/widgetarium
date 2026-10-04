import type { ReactNode } from "react";
import { useDrawsInPane } from "./use-draws-in-pane.js";

const PANE_SELECTOR = ".wg-design-screen, .markdown-reading-view, .markdown-source-view, .view-content";

export interface PageProps {
	readonly boardNode?: Element | null | undefined;
	readonly children?: ReactNode;
}

export function Page({ boardNode, children }: PageProps): ReactNode {
	const pane = boardNode?.closest<HTMLElement>(PANE_SELECTOR);
	useDrawsInPane(pane, children);
	return pane ? null : children;
}
