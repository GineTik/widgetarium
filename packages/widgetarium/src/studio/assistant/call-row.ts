import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { AssistantCall, CallFace } from "@widgetarium/core/engine/assistant-port.js";
import { CallDetail } from "./call-detail.js";
import { Chevron } from "./chevron.js";

export interface CallRowProps {
	readonly call: AssistantCall;
	readonly face: CallFace;
	readonly isOpen: boolean;
	readonly onToggle: () => void;
}

const INPUT = "Input";
const OUTPUT = "Output";

export function CallRow({ call, face, isOpen, onToggle }: CallRowProps): ReactElement {
	const shown = JSON.stringify(call.input, null, "\t");
	const canOpen = shown !== "{}" || call.output !== "";
	return h("div", { className: call.failed ? "wg-studio-ai-call is-failed" : "wg-studio-ai-call" }, [
		h("span", { className: "wg-studio-ai-call-rail", key: "rail" }, h(Icon, { name: face.glyph, size: 14 })),
		h("div", { className: "wg-studio-ai-call-body", key: "body" }, [
			h(
				"button",
				{ className: "wg-studio-ai-call-head", key: "head", type: "button", disabled: !canOpen, onClick: onToggle },
				[
					h("span", { className: "wg-studio-ai-call-name", key: "name" }, face.title),
					canOpen ? h(Chevron, { key: "mark", isOpen }) : null,
				],
			),
			face.hint === "" ? null : h("p", { className: "wg-studio-ai-call-hint", key: "hint" }, face.hint),
			isOpen && canOpen
				? h("div", { className: "wg-studio-ai-call-open", key: "open" }, [
						shown === "{}" ? null : h(CallDetail, { key: "in", label: INPUT, said: shown }),
						call.output === "" ? null : h(CallDetail, { key: "out", label: OUTPUT, said: call.output }),
					])
				: null,
		]),
	]);
}
