import { createElement as h, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { Icon } from "@widgetarium/kit";
import type { AssistantCall, CallFace } from "@widgetarium/core/engine/assistant-port.js";
import { CallRow } from "./call-row.js";
import { Chevron } from "./chevron.js";

export interface ToolCallsProps {
	readonly calls: readonly AssistantCall[];
	readonly describe: (call: AssistantCall) => CallFace;
}

const USED_ONE = "Used 1 tool";
const USED_MANY = "Used {count} tools";
const SOME_FAILED = "{count} failed";
const MOST_GLYPHS = 5;

export function failuresIn(calls: readonly { readonly failed: boolean }[]): number {
	return calls.filter((call) => call.failed).length;
}

export function firstGlyphsOf(glyphs: readonly string[], most: number): string[] {
	return [...new Set(glyphs)].slice(0, most);
}

export function ToolCalls({ calls, describe }: ToolCallsProps): ReactElement {
	const [isOpen, setOpen] = useState(false);
	const [openCalls, setOpenCalls] = useState<ReadonlySet<number>>(() => new Set());
	const faces = calls.map(describe);
	const toggleCall = (at: number): void => setOpenCalls((held) => withToggled(held, at));
	return h("div", { className: "wg-studio-ai-tools" }, [
		h(
			"button",
			{ className: "wg-studio-ai-tools-head", key: "head", type: "button", onClick: () => setOpen(!isOpen) },
			toolsHeadOf(calls, faces, isOpen),
		),
		isOpen
			? h(
					"div",
					{ className: "wg-studio-ai-tools-list", key: "list" },
					calls.map((call, at) =>
						h(CallRow, {
							key: `${call.ref}-${at}`,
							call,
							face: faces[at] ?? describe(call),
							isOpen: openCalls.has(at),
							onToggle: () => toggleCall(at),
						}),
					),
				)
			: null,
	]);
}

function toolsHeadOf(calls: readonly AssistantCall[], faces: readonly CallFace[], isOpen: boolean): ReactNode[] {
	const failed = failuresIn(calls);
	const marks = firstGlyphsOf(
		faces.map((face) => face.glyph),
		MOST_GLYPHS,
	).map((glyph, at) =>
		h(
			"span",
			{ className: "wg-studio-ai-tools-mark", key: glyph, style: { zIndex: at } },
			h(Icon, { name: glyph, size: 13 }),
		),
	);
	const said = calls.length === 1 ? USED_ONE : USED_MANY.replace("{count}", String(calls.length));
	return [
		h("span", { className: "wg-studio-ai-tools-marks", key: "marks" }, marks),
		h("span", { className: "wg-studio-ai-tools-said", key: "said" }, said),
		failed === 0
			? null
			: h(
					"span",
					{ className: "wg-studio-ai-tools-failed", key: "failed" },
					SOME_FAILED.replace("{count}", String(failed)),
				),
		h(Chevron, { key: "mark", isOpen }),
	];
}

function withToggled(held: ReadonlySet<number>, at: number): ReadonlySet<number> {
	const next = new Set(held);
	if (next.has(at)) next.delete(at);
	else next.add(at);
	return next;
}
