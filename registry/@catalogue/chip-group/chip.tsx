import type { PropsOf, Row } from "widgetarium";
import { Button } from "widgetarium/kit";
import type ChipGroup from "./widget";

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
			className="wg-catalogue-chip"
			aria-pressed={isOn}
			onClick={() => void select(isOn ? null : chip.name)}
		>
			{chip.label}
		</Button>
	);
}
