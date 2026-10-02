import { Card } from "widgetarium/kit";
import type { CardFace } from "./types";

// TRADE-OFF: the task-card widget owns the card; this draws a title when the slot is empty
export function FallbackCard({ getTask: task }: { getTask: CardFace }) {
	return (
		<Card type="group">
			<span className="ok-card-title">{String(task.title ?? "")}</span>
		</Card>
	);
}
