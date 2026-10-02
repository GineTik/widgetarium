import "./packs-registered.ts";
import { createElement as h, useEffect, useState } from "react";
import type { ReactElement } from "react";
import { render } from "../packages/core/src/engine/render.js";
import { SubstitutionDialog } from "../apps/obsidian/src/substitution-dialog.js";
import { WidgetRegistry } from "../packages/core/src/registry.js";
import { normalizeRules } from "../apps/obsidian/src/substitution.js";
import type { Rule } from "../apps/obsidian/src/substitution.js";
import { filesAdapter, pageFiles } from "./page-harness.ts";

const adapter = filesAdapter(pageFiles());

const CODE = { id: "sub-0", name: "Code", mode: "line", open: "!code", widget: "@default/code-block" };
const REMINDER = { id: "sub-1", name: "Reminder", mode: "line", open: "!", widget: "@default/reminder" };
const NOTE = {
	id: "sub-2",
	name: "Note",
	mode: "wrapped",
	open: ":::",
	close: ":::",
	widget: "@default/note",
	enabled: false,
};
const TIMECODE = {
	id: "sub-3",
	name: "Timecode",
	mode: "regex",
	pattern: "^@(\\d{1,2}:\\d{2})\\s+(.+)$",
	widget: "@default/reminder",
	draft: true,
};
const BROKEN = { id: "sub-4", name: "Timecode", mode: "regex", pattern: "", widget: "@default/reminder", draft: true };

const CASES: Readonly<Record<string, readonly unknown[]>> = {
	live: [CODE, REMINDER, NOTE, TIMECODE],
	draft: [{ ...REMINDER, draft: true }, CODE, NOTE, TIMECODE],
	off: [{ ...NOTE, enabled: false, draft: false }, CODE, REMINDER, TIMECODE],
	invalid: [BROKEN, CODE, REMINDER, NOTE],
	empty: [],
};

function askedCase(): string {
	return new URLSearchParams(window.location.search).get("case") ?? "live";
}

function Harness(): ReactElement {
	const [registry, setRegistry] = useState<WidgetRegistry | null>(null);
	const [rules, setRules] = useState<Rule[]>(normalizeRules(CASES[askedCase()] ?? CASES["live"]));

	useEffect(() => {
		const loading = new WidgetRegistry({ vault: { adapter } });
		void loading.load().then(() => setRegistry(loading));
	}, []);

	if (!registry) return h("p", null, "Loading widgets…");
	return h(SubstitutionDialog, { rules, registry, host: null, onChange: setRules, onClose: () => {} });
}

function pressListOpen(): void {
	const button = document.querySelector(".wg-sub-open");
	if (button) button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

const hostNode = document.getElementById("host");
if (hostNode) render(h(Harness), hostNode);

if (new URLSearchParams(window.location.search).get("open") === "list") setTimeout(pressListOpen, 900);
