import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { AssistantPort, AssistantSetup } from "@widgetarium/core/engine/assistant-port.js";
import { ProviderMenu } from "./provider-menu.js";
import type { Report } from "./failure-line.js";

export interface ChatHeadProps {
	readonly port: AssistantPort;
	readonly setup: AssistantSetup;
	readonly report: Report;
}

const TITLE = "Widgetarium AI";
const NOT_CHOSEN = "the provider {id} could not be chosen";
const HELPERS_NOT_SWITCHED = "helper agents could not be switched";
const NOT_CLEARED = "the conversation could not be cleared";

export function ChatHead({ port, setup, report }: ChatHeadProps): ReactElement {
	return h("header", { className: "wg-studio-ai-head" }, [
		h("span", { className: "wg-studio-ai-title", key: "title" }, TITLE),
		h("span", { className: "wg-studio-ai-who", key: "who" }, setup.providerLabel),
		h(ProviderMenu, {
			key: "menu",
			setup,
			onChoose: (id: string) => void report(port.chooseProvider(id), NOT_CHOSEN.replace("{id}", id)),
			onOpenProviders: () => port.openProviders(),
			onHelperAgents: (on: boolean) => void report(port.setHelperAgents(on), HELPERS_NOT_SWITCHED),
			onClear: () => void report(port.clear(), NOT_CLEARED),
		}),
	]);
}
