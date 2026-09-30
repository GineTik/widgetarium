import { createElement as h, useContext, useEffect, useRef } from "react";
import type { ComponentType, ContextType, ReactElement, RefObject } from "react";
import { rootWidget } from "./widget-root.js";
import { PLATES_ABOVE } from "@widgetarium/kit/surface";
import { MountSettingsButton } from "./mount-settings-button.js";
import type { EnterableMount } from "./mount-settings-button.js";
import type { Release } from "./gateway/host.js";

export { DrawnInShell } from "./drawn-in-shell.js";

export type PlatesAbove = ContextType<typeof PLATES_ABOVE>;

export type DrawWidget<Props> = (element: HTMLElement, component: ComponentType<Props>, props: Props) => Release;

interface DrawableWidget<Props> {
	readonly component: ComponentType<Props>;
	readonly draw?: DrawWidget<Props> | null | undefined;
	readonly manifest?: { readonly id?: string | undefined } | null | undefined;
}

interface MountedEntry {
	readonly name?: string | undefined;
	readonly title?: string | null | undefined;
	readonly drawInto?: ((element: HTMLElement, platesAbove: PlatesAbove) => Release) | null | undefined;
	readonly enter?: (() => void) | null | undefined;
}

export interface MountedProps {
	readonly entry: MountedEntry;
}

export function drawWidget<Props extends object>(definition: DrawableWidget<Props>, props: Props): ReactElement {
	const draw = definition.draw;
	if (!draw) return rootWidget(h(definition.component, props));
	const entry = {
		name: definition.manifest?.id,
		drawInto: (element: HTMLElement) => draw(element, definition.component, props),
	};
	return h(Mounted, { entry });
}

export function Mounted({ entry }: MountedProps): ReactElement {
	const node = useDrawsInto(entry);
	if (!entry.drawInto) return nothingToDraw(entry);
	const drawn = h("div", { className: "wg-mounted", ref: node, key: "drawn" });
	if (!isEnterable(entry)) return drawn;
	return h("div", { className: "wg-mounted-holder" }, [drawn, h(MountSettingsButton, { entry, key: "press" })]);
}

function useDrawsInto(entry: MountedEntry): RefObject<HTMLDivElement | null> {
	const node = useRef<HTMLDivElement>(null);
	const release = useRef<Release | null>(null);
	const platesAbove = useContext(PLATES_ABOVE);

	useEffect(() => {
		if (entry.drawInto) {
			if (node.current) release.current = entry.drawInto(node.current, platesAbove);
			return;
		}
		release.current?.();
		release.current = null;
	});
	useEffect(() => () => release.current?.(), []);
	return node;
}

function nothingToDraw(entry: MountedEntry): ReactElement {
	console.error(
		`Widgetarium: Mounted was given "${entry.name}", which has nothing to draw — branch on entry.problem first`,
	);
	return h("div", { className: "wg-missing" }, h("b", null, "This view cannot be drawn"));
}

function isEnterable(entry: MountedEntry): entry is MountedEntry & EnterableMount {
	return Boolean(entry.enter);
}
