import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, List, Row, RowLabel, RowValue } from "@widgetarium/kit";
import type { AiState } from "./settings.js";

export interface ProviderRowsProps {
	readonly ai: AiState;
	readonly onEdit: (id: string) => void;
}

const IN_USE = "In use";

// TODO: mark the provider being edited once kit Row has a selected state
export function ProviderRows({ ai, onEdit }: ProviderRowsProps): ReactElement {
	return h(
		List,
		{ className: "wg-ai-providers" },
		ai.providers.map((provider) =>
			h(
				Row,
				{
					key: provider.id,
					pressable: true,
					onClick: () => onEdit(provider.id),
				},
				[
					h(RowLabel, { key: "label" }, provider.label),
					provider.id === ai.chosen ? h(RowValue, { key: "value" }, IN_USE) : null,
					h(Icon, { key: "mark", name: "chevron" }),
				],
			),
		),
	);
}
