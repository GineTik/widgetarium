import { useEffect, useRef } from "react";
import { mountInto } from "../portal.js";
import { trace } from "../trace.js";

export function useDrawsInPane(pane, children) {
	const pageRef = useRef(null);

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

function standPageIn(pane) {
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
