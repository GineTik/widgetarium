import { createElement as h, useContext, useEffect, useRef } from "react";
import { rootWidget } from "./widget-root.js";
import { PLATES_ABOVE } from "@widgetarium/kit/surface";
import { MountSettingsButton } from "./mount-settings-button.js";

export { DrawnInShell } from "./drawn-in-shell.js";

export function drawWidget(definition, props) {
	if (!definition.draw) return rootWidget(h(definition.component, props));
	const entry = {
		name: definition.manifest?.id,
		drawInto: (element) => definition.draw(element, definition.component, props),
	};
	return h(Mounted, { entry });
}

export function Mounted({ entry }) {
	const node = useDrawsInto(entry);
	if (!entry.drawInto) return nothingToDraw(entry);
	const drawn = h("div", { className: "wg-mounted", ref: node, key: "drawn" });
	if (!entry.enter) return drawn;
	return h("div", { className: "wg-mounted-holder" }, [drawn, h(MountSettingsButton, { entry, key: "press" })]);
}

function useDrawsInto(entry) {
	const node = useRef(null);
	const release = useRef(null);
	const platesAbove = useContext(PLATES_ABOVE);

	useEffect(() => {
		if (entry.drawInto) {
			release.current = entry.drawInto(node.current, platesAbove);
			return;
		}
		release.current?.();
		release.current = null;
	});
	useEffect(() => () => release.current?.(), []);
	return node;
}

function nothingToDraw(entry) {
	console.error(
		`Widgetarium: Mounted was given "${entry.name}", which has nothing to draw — branch on entry.problem first`,
	);
	return h("div", { className: "wg-missing" }, h("b", null, "This view cannot be drawn"));
}
