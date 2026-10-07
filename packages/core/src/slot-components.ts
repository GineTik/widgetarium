import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { Card } from "@widgetarium/kit";
import { Mounted } from "./mounted.js";
import type { MountEntry } from "./gateway/host.js";
import { SLOT_ENTRY_MARK, WIDGET_MARK } from "./engine/node-marks.js";

export interface SlotComponent {
	(props: SlotProps): ReactElement | null;
	readonly id: string;
	readonly entry: MountEntry | null;
}

export interface SlotProps {
	readonly className?: string | undefined;
}

export type SlotList = readonly SlotComponent[] & { readonly entries: readonly MountEntry[] };

const NOT_DRAWN = "{name} could not be drawn: {why}";
const CONTENT_SIZED_ROLE = "control";

export function useSlotsOf(entries: readonly MountEntry[], isSingle: boolean): SlotComponent | SlotList {
	const made = useRef(new Map<string, SlotComponent>());
	const latest = useRef(new Map<string, MountEntry>());
	const shown = entries.filter((entry) => !entry.hidden);
	for (const entry of shown) latest.current.set(entry.name, entry);
	const components = shown.map((entry) => componentFor(entry.name, made.current, latest.current));
	if (isSingle) return components[0] ?? EMPTY_SLOT;
	return Object.assign(components, { entries });
}

const EMPTY_SLOT: SlotComponent = Object.assign((): null => null, { id: "", entry: null });

function componentFor(
	name: string,
	made: Map<string, SlotComponent>,
	latest: ReadonlyMap<string, MountEntry>,
): SlotComponent {
	const known = made.get(name);
	if (known) return known;
	const Slot = ({ className }: SlotProps): ReactElement | null => {
		const entry = latest.get(name);
		return entry ? drawnEntry(entry, className) : null;
	};
	const component: SlotComponent = Object.defineProperties(Slot, {
		id: { value: name },
		entry: { get: () => latest.get(name) ?? null },
	}) as SlotComponent;
	made.set(name, component);
	return component;
}

function drawnEntry(entry: MountEntry, className: string | undefined): ReactElement | null {
	if (entry.problem === "empty") return null;
	if (entry.problem)
		return h(
			"div",
			{ className: "wg-missing" },
			NOT_DRAWN.replace("{name}", entry.title || entry.name).replace("{why}", entry.failure ?? entry.problem),
		);
	const drawn = h(Mounted, { entry });
	const plated = entry.surface ? h(Card, { type: entry.surface, className }, drawn) : drawn;
	return h(
		"div",
		{
			className: entry.manifest?.["role"] === CONTENT_SIZED_ROLE ? "wg-slot is-content-width" : "wg-slot",
			[SLOT_ENTRY_MARK]: entry.name,
			[WIDGET_MARK]: entry.id ?? "",
			"data-name": entry.title || entry.name,
		},
		plated,
	);
}
