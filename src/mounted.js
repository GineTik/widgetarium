import { createElement as h, useEffect, useRef } from "react";

export function Mounted({ entry }) {
	const node = useRef(null);
	const release = useRef(null);

	useEffect(() => {
		if (entry.drawInto) {
			release.current = entry.drawInto(node.current);
			return;
		}
		release.current?.();
		release.current = null;
	});
	useEffect(() => () => release.current?.(), []);

	if (!entry.drawInto) {
		console.error(`Widgetarium: Mounted was given "${entry.name}", which has nothing to draw — branch on entry.problem first`);
		return h("div", { className: "wg-missing" }, h("b", null, "This view cannot be drawn"));
	}
	return h("div", { className: "wg-mounted", ref: node });
}
