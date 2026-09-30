import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { mountInto } from "../portal.js";
import type { PortalMount } from "../portal.js";
import { trace } from "../trace.js";

interface StoodPage {
	readonly page: PortalMount;
	readonly leave: () => void;
}

export function useDrawsInPane(pane: HTMLElement | null | undefined, children: ReactNode): void {
	const pageRef = useRef<PortalMount | null>(null);

	useEffect(() => {
		if (!pane) return trace("page stays in the block", { reason: "the board's own node stands in no pane yet" });
		const stood = standPageIn(pane);
		pageRef.current = stood.page;
		return () => {
			stood.leave();
			pageRef.current = null;
		};
	}, [pane]);

	useEffect(() => {
		pageRef.current?.draw(children);
	});
}

function standPageIn(pane: HTMLElement): StoodPage {
	const wasStatic = getComputedStyle(pane).position === "static";
	if (wasStatic) pane.style.position = "relative";
	const page = mountInto(pane, "wg-page");
	return {
		page,
		leave: () => {
			page.dispose();
			if (wasStatic) pane.style.position = "";
		},
	};
}
