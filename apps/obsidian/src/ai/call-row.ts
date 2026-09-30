import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { glyphOf, hintOf, titleOf } from "./tools.js";
import type { KeptCall } from "./transcript.js";
import { CallDetail } from "./call-detail.js";

export interface CallRowProps {
	readonly call: KeptCall;
	readonly isOpen: boolean;
	readonly onToggle: () => void;
}

const INPUT = "Input";
const OUTPUT = "Output";

export function CallRow({ call, isOpen, onToggle }: CallRowProps): ReactElement {
	const shown = JSON.stringify(call.input, null, "\t");
	const canOpen = shown !== "{}" || call.output !== "";
	return h("div", { className: call.failed ? "wg-ai-call is-failed" : "wg-ai-call" }, [
		h("span", { className: "wg-ai-call-rail", key: "rail" }, h(Icon, { name: glyphOf(call), size: 14 })),
		h("div", { className: "wg-ai-call-body", key: "body" }, [
			h(
				"button",
				{ className: "wg-ai-call-head", key: "head", type: "button", disabled: !canOpen, onClick: onToggle },
				[
					h("span", { className: "wg-ai-call-name", key: "name" }, titleOf(call)),
					canOpen
						? h(Icon, {
								key: "mark",
								name: "chevron",
								size: 12,
								className: isOpen ? "wg-ai-turn-mark is-open" : "wg-ai-turn-mark",
							})
						: null,
				],
			),
			hintOf(call) === "" ? null : h("p", { className: "wg-ai-call-hint", key: "hint" }, hintOf(call)),
			isOpen && canOpen
				? h("div", { className: "wg-ai-call-open", key: "open" }, [
						shown === "{}" ? null : h(CallDetail, { key: "in", label: INPUT, said: shown }),
						call.output === "" ? null : h(CallDetail, { key: "out", label: OUTPUT, said: call.output }),
					])
				: null,
		]),
	]);
}
