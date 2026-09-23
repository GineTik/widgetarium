import { createElement as h, useContext, useEffect, useLayoutEffect, useRef } from "react";
import { leaseFor } from "./engine/render.js";
import { rootedWidget } from "./widget-root.js";
import { Icon, IconButton } from "@widgetarium/kit";
import { PLATES_ABOVE } from "@widgetarium/kit/surface";

export function DrawnInShell({ shell, tree }) {
	const node = useRef(null);

	useLayoutEffect(() => {
		if (shell.parentElement !== node.current) node.current.appendChild(shell);
		leaseFor(shell).draw(tree);
	});

	return h("div", { className: "wg-drawn", ref: node });
}

export function drawnWidget(definition, props) {
	if (!definition.draw) return rootedWidget(h(definition.component, props));
	const entry = {
		name: definition.manifest?.id,
		drawInto: (element) => definition.draw(element, definition.component, props),
	};
	return h(Mounted, { entry });
}

function useDrawnInto(entry) {
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

export function Mounted({ entry }) {
	const node = useDrawnInto(entry);
	if (!entry.drawInto) return nothingToDraw(entry);
	const drawn = h("div", { className: "wg-mounted", ref: node, key: "drawn" });
	if (!entry.enter) return drawn;
	return h("div", { className: "wg-mounted-holder" }, [drawn, h(MountSettingsButton, { entry, key: "press" })]);
}

function nothingToDraw(entry) {
	console.error(
		`Widgetarium: Mounted was given "${entry.name}", which has nothing to draw — branch on entry.problem first`,
	);
	return h("div", { className: "wg-missing" }, h("b", null, "This view cannot be drawn"));
}

// TRADE-OFF: board chrome in a layer-neutral primitive; the widget places its own mounts, so nothing above this sits between a mount and its drawn node
function pressEntered(entry) {
	return (event) => {
		event.stopPropagation();
		entry.enter();
	};
}

function MountSettingsButton({ entry }) {
	const press = { size: "s", label: `Settings for ${entry.title ?? entry.name}`, onClick: pressEntered(entry) };
	return h("div", { className: "wg-mount-actions" }, h(IconButton, press, h(Icon, { name: "settings" })));
}
