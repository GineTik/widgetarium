import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Badge } from "../../index";
import { STATUSES } from "../showcase-data";

const BADGE_COLORS = ["red", "orange", "yellow", "green", "cyan", "blue", "purple", "pink"];

export function BadgesDemo(): ReactElement {
	return (
		<div className="wg-showcase-stack">
			<div className="wg-showcase-row">
				{STATUSES.map((status) => (
					<Badge key={status.label} tone={status.tone}>
						{status.label}
					</Badge>
				))}
				<Badge variant="default">3</Badge>
			</div>
			<div className="wg-showcase-row">
				{BADGE_COLORS.map((color) => (
					<Badge key={color} color={color} size="s">
						{color}
					</Badge>
				))}
			</div>
		</div>
	);
}
