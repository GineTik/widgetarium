import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Icon } from "@widgetarium/kit";
import type { AssistantSetup } from "@widgetarium/core/engine/assistant-port.js";

export interface EmptyChatProps {
	readonly setup: AssistantSetup;
	readonly onOpenProviders: () => void;
}

const EMPTY_LEAD = "Tell me what this screen should do.";
const EMPTY_SAID = "I will find the widgets, put them on the board one at a time, and bind them to your notes.";
const NO_PROVIDER_LEAD = "{label} is not on this machine yet.";
const NO_PROVIDER_SAID =
	"Install it, or pick a provider that is already here. Everything on the list runs locally and is free to use.";
const SET_UP = "Set up a provider";

export function EmptyChat({ setup, onOpenProviders }: EmptyChatProps): ReactElement {
	if (setup.isReady) {
		return h("div", { className: "wg-studio-ai-empty" }, [
			h(Icon, { key: "mark", name: "sparkle", size: 28 }),
			h("p", { className: "wg-studio-ai-empty-lead", key: "lead" }, EMPTY_LEAD),
			h("p", { className: "wg-studio-ai-empty-said", key: "said" }, EMPTY_SAID),
		]);
	}
	return h("div", { className: "wg-studio-ai-empty" }, [
		h(Icon, { key: "mark", name: "gear", size: 28 }),
		h(
			"p",
			{ className: "wg-studio-ai-empty-lead", key: "lead" },
			NO_PROVIDER_LEAD.replace("{label}", setup.providerLabel),
		),
		h("p", { className: "wg-studio-ai-empty-said", key: "said" }, NO_PROVIDER_SAID),
		h(Button, { key: "set-up", variant: "accent", size: "m", onClick: onOpenProviders }, SET_UP),
	]);
}
