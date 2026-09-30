import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { Icon, IconButton, Popover, PopoverItem, PopoverSeparator } from "@widgetarium/kit";
import type { AiState } from "./settings.js";

export interface ProviderMenuProps {
	readonly ai: AiState;
	readonly onChoose: (id: string) => void;
	readonly onOpenProviders: () => void;
	readonly onClear: () => void;
}

const CONFIGURE = "Configure providers";
const CLEAR = "Clear context";
const CHAT_ONLY = "chat only";
const MENU = "Provider and context";

export function ProviderMenu({ ai, onChoose, onOpenProviders, onClear }: ProviderMenuProps): ReactElement {
	const [isOpen, setOpen] = useState(false);
	const pick = (id: string): void => {
		setOpen(false);
		onChoose(id);
	};
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
			className: "wg-ai-menu",
			trigger: h(IconButton, { variant: "neutral", size: "s", "aria-label": MENU }, h(Icon, { name: "dots" })),
		},
		[
			...ai.providers.map((provider) =>
				h(
					PopoverItem,
					{ key: provider.id, checked: provider.id === ai.chosen, onClick: () => pick(provider.id) },
					provider.canEdit ? provider.label : `${provider.label} · ${CHAT_ONLY}`,
				),
			),
			h(PopoverSeparator, { key: "line" }),
			h(PopoverItem, { key: "configure", onClick: closingThen(onOpenProviders) }, CONFIGURE),
			h(PopoverItem, { key: "clear", onClick: closingThen(onClear) }, CLEAR),
		],
	);
}
