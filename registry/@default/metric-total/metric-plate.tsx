import { Card } from "widgetarium/kit";

type PlateProps = { name: string; label: string; value: string; isTone?: boolean };

export function MetricPlate({ name, label, value, isTone }: PlateProps) {
	const worn = isTone ? `mt3-plate mt3-plate-${name} is-tone` : `mt3-plate mt3-plate-${name}`;
	return (
		<Card type="group" data-part={`plate-${name}`} className={worn}>
			<span data-part={`plate-${name}-value`} className="mt3-plate-value">
				{value}
			</span>
			<span data-part={`plate-${name}-label`} className="mt3-plate-label">
				{label}
			</span>
		</Card>
	);
}
