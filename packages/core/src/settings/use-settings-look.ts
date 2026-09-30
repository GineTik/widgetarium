import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Hold } from "../held-records.js";
import { CHROME } from "../settings-fit.js";
import type { Point } from "../settings-fit.js";

export type SettingsTab = "settings" | "data" | "design";

export interface MountStep {
	readonly hold: Hold;
	readonly key: string;
	readonly widget: string;
	readonly was?: string | null | undefined;
	readonly fed?: readonly string[] | undefined;
}

export interface LookView {
	readonly key: string | undefined;
	readonly tab: SettingsTab;
	readonly zoom: number | null;
	readonly pan: Point | null;
	readonly folded: boolean;
	readonly narrow: boolean;
	readonly sheetFull: boolean;
	readonly openRow: string | null;
	readonly draft: string;
	readonly path: readonly MountStep[];
}

export type LookPatch = Partial<Omit<LookView, "key">>;

export interface SettingsLook {
	readonly open: boolean;
	readonly closing: boolean;
	readonly view: LookView;
	readonly put: (patch: LookPatch) => void;
	readonly sheetHeight: number;
	readonly setSheetHeight: Dispatch<SetStateAction<number>>;
}

// TRADE-OFF: one keyed record, not eight resets in an effect — an effect that resets on open RACES the first press, and wiped the popover the person had just opened
const FRESH: Omit<LookView, "key"> = {
	tab: "settings",
	zoom: null,
	pan: null,
	folded: false,
	narrow: false,
	sheetFull: false,
	openRow: null,
	draft: "",
	path: [],
};

export function useSettingsLook(
	session: string | number | null | undefined,
	entryPath: readonly MountStep[] | null | undefined,
): SettingsLook {
	const [phase, key] = String(session ?? "").split(":");
	const [held, setHeld] = useState<LookView | null>(null);
	const [sheetHeight, setSheetHeight] = useState(CHROME.sheetPeekPx);
	const born: LookView = { ...FRESH, key, path: entryPath ?? [] };
	const view = held && held.key === key ? held : born;
	const put = (patch: LookPatch): void =>
		setHeld((current) => ({ ...(current && current.key === key ? current : born), ...patch }));
	return { open: phase === "open", closing: phase === "closing", view, put, sheetHeight, setSheetHeight };
}
