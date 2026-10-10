import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { Icon, IconButton, Popover, PopoverItem, PopoverSeparator } from "@widgetarium/kit";
import type { AssistantSetup } from "@widgetarium/core/engine/assistant-port.js";

export interface ProviderMenuProps {
	readonly setup: AssistantSetup;
	readonly onChoose: (id: string) => void;
	readonly onOpenProviders: () => void;
	readonly onClear: () => void;
	readonly onHelperAgents: (on: boolean) => void;
}

const CONFIGURE = "Configure providers";
const CLEAR = "Clear context";
const CHAT_ONLY = "chat only";
const MENU = "Provider and context";
const HELPERS = "Use helper agents";

export function ProviderMenu({
	setup,
	onChoose,
	onOpenProviders,
	onClear,
	onHelperAgents,
}: ProviderMenuProps): ReactElement {
	const [isOpen, setOpen] = useState(false);
	const closingThen =
		(action: () => void): (() => void) =>
		() => {
			setOpen(false);
			action();
		};
	return h(
		Popover,
		{
			isOpen,
			onOpenChange: setOpen,
			placement: "below",
			className: "wg-studio-ai-menu",
			trigger: h(IconButton, { variant: "neutral", size: "s", "aria-label": MENU }, h(Icon, { name: "dots" })),
		},
		[
			...setup.providers.map((provider) =>
				h(
					PopoverItem,
					{
						key: provider.id,
						checked: provider.id === setup.chosen,
						onClick: closingThen(() => onChoose(provider.id)),
					},
					provider.canEdit ? provider.label : `${provider.label} · ${CHAT_ONLY}`,
				),
			),
			h(PopoverSeparator, { key: "line" }),
			h(
				PopoverItem,
				{
					key: "helpers",
					checked: setup.helperAgents,
					onClick: closingThen(() => onHelperAgents(!setup.helperAgents)),
				},
				HELPERS,
			),
			h(PopoverItem, { key: "configure", onClick: closingThen(onOpenProviders) }, CONFIGURE),
			h(PopoverItem, { key: "clear", onClick: closingThen(onClear) }, CLEAR),
		],
	);
}
