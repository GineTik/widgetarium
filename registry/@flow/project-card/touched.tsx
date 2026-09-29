import { Icon } from "widgetarium/kit";

const TOUCHED = "Touched {when}";

export function Touched({ when }: { when: string | null }) {
	if (when === null) return null;
	return (
		<div className="flow-project-card-touched">
			<Icon name="clock" size={14} />
			<span className="flow-project-card-touched-text">{TOUCHED.replace("{when}", when)}</span>
		</div>
	);
}
