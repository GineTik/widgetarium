import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { failuresIn, glyphsOf } from "./tools.js";
import type { KeptCall } from "./transcript.js";
import { CallRow } from "./call-row.js";

export interface ToolCallsProps {
	readonly calls: readonly KeptCall[];
}

const USED_ONE = "Used 1 tool";
const USED_MANY = "Used {count} tools";
const SOME_FAILED = "{count} failed";
const MOST_GLYPHS = 5;

export function ToolCalls({ calls }: ToolCallsProps): ReactElement {
	const [isOpen, setOpen] = useState(false);
	const [openCalls, setOpenCalls] = useState<ReadonlySet<number>>(() => new Set());
	const failed = failuresIn(calls);

	const toggleCall = (at: number): void =>
		setOpenCalls((held) => {
			const next = new Set(held);
			if (next.has(at)) next.delete(at);
			else next.add(at);
			return next;
		});

	return h("div", { className: "wg-ai-tools" }, [
		h("button", { className: "wg-ai-tools-head", key: "head", type: "button", onClick: () => setOpen(!isOpen) }, [
			h(
				"span",
				{ className: "wg-ai-tools-marks", key: "marks" },
				glyphsOf(calls, MOST_GLYPHS).map((glyph, at) =>
					h(
						"span",
						{ className: "wg-ai-tools-mark", key: glyph, style: { zIndex: at } },
						h(Icon, { name: glyph, size: 13 }),
					),
				),
			),
			h(
				"span",
				{ className: "wg-ai-tools-said", key: "said" },
				calls.length === 1 ? USED_ONE : USED_MANY.replace("{count}", String(calls.length)),
			),
			failed === 0
				? null
				: h("span", { className: "wg-ai-tools-failed", key: "failed" }, SOME_FAILED.replace("{count}", String(failed))),
			h(Icon, {
				key: "mark",
				name: "chevron",
				size: 12,
				className: isOpen ? "wg-ai-turn-mark is-open" : "wg-ai-turn-mark",
			}),
		]),
		isOpen
			? h(
					"div",
					{ className: "wg-ai-tools-list", key: "list" },
					calls.map((call, at) =>
						h(CallRow, { key: `${call.ref}-${at}`, call, isOpen: openCalls.has(at), onToggle: () => toggleCall(at) }),
					),
				)
			: null,
	]);
}
