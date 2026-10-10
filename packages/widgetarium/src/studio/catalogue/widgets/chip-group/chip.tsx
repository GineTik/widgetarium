import { createElement as h } from "react";
import type { PropsOf } from "@widgetarium/core/gateway/declared.js";
import type { Row } from "@widgetarium/core/gateway/contract.js";
import { Button } from "@widgetarium/kit";
import type ChipGroup from "./widget.js";

interface ChipProps {
	readonly chip: Row<{ readonly name: string; readonly label: string }>;
	readonly picked: string;
	readonly select: PropsOf<typeof ChipGroup>["select"];
}

export function Chip({ chip, picked, select }: ChipProps) {
	const isOn = picked === chip.name;
	return (
		<Button
			size="s"
			variant={isOn ? "accent" : "neutral"}
			className="wg-studio-catalogue-chip"
			aria-pressed={isOn}
			onClick={() => void select(isOn ? null : chip.name)}
		>
			{chip.label}
		</Button>
	);
}
