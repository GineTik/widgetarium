import { useState } from "react";
import { CHROME } from "../settings-fit.js";

// TRADE-OFF: one keyed record, not eight resets in an effect — an effect that resets on open RACES the first press, and wiped the popover the person had just opened
const FRESH = {
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

export function useSettingsLook(session, entryPath) {
	const [phase, key] = String(session ?? "").split(":");
	const [held, setHeld] = useState(null);
	const [sheetHeight, setSheetHeight] = useState(CHROME.sheetPeekPx);
	const born = { ...FRESH, key, path: entryPath ?? [] };
	const view = held && held.key === key ? held : born;
	const put = (patch) => setHeld((current) => ({ ...(current && current.key === key ? current : born), ...patch }));
	return { open: phase === "open", closing: phase === "closing", view, put, sheetHeight, setSheetHeight };
}
