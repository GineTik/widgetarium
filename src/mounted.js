import { createElement as h, useEffect, useLayoutEffect, useRef } from "react";
import { leaseFor } from "./engine/render.js";

export function DrawnInShell({ shell, tree }) {
	const node = useRef(null);

	useLayoutEffect(() => {
		if (shell.parentElement !== node.current) node.current.appendChild(shell);
		leaseFor(shell).draw(tree);
	});

	return h("div", { className: "wg-drawn", ref: node });
}

export function drawnWidget(definition, props) {
	if (!definition.draw) return h(definition.component, props);
	const entry = { name: definition.manifest?.id, drawInto: (element) => definition.draw(element, definition.component, props) };
	return h(Mounted, { entry });
}

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
