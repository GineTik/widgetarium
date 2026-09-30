import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Icon } from "@widgetarium/kit";
import type { AssistantState } from "./assistant.js";

export interface EmptyChatProps {
	readonly ai: AssistantState;
	readonly onOpenProviders: () => void;
}

const EMPTY_LEAD = "Tell me what this screen should do.";
const EMPTY_SAID = "I will find the widgets, put them on the board one at a time, and bind them to your notes.";
const NO_PROVIDER_LEAD = "{label} is not on this machine yet.";
const NO_PROVIDER_SAID =
	"Install it, or pick a provider that is already here. Everything on the list runs locally and is free to use.";
const SET_UP = "Set up a provider";

export function EmptyChat({ ai, onOpenProviders }: EmptyChatProps): ReactElement {
	if (ai.ready) {
		return h("div", { className: "wg-ai-empty" }, [
			h(Icon, { key: "mark", name: "sparkle", size: 28 }),
			h("p", { className: "wg-ai-empty-lead", key: "lead" }, EMPTY_LEAD),
			h("p", { className: "wg-ai-empty-said", key: "said" }, EMPTY_SAID),
		]);
	}
	return h("div", { className: "wg-ai-empty" }, [
		h(Icon, { key: "mark", name: "gear", size: 28 }),
		h("p", { className: "wg-ai-empty-lead", key: "lead" }, NO_PROVIDER_LEAD.replace("{label}", ai.provider.label)),
		h("p", { className: "wg-ai-empty-said", key: "said" }, NO_PROVIDER_SAID),
		h(Button, { key: "set-up", variant: "accent", size: "m", onClick: onOpenProviders }, SET_UP),
	]);
}
