import { Icon, Card } from "widgetarium/kit";

export function MissingImage({ said, alt }: { said: string; alt: string }) {
	return (
		<Card type="group" className="flow-report-figure-missing" data-part="missing">
			<Icon name="image-off" size={20} />
			<span className="flow-report-figure-missing-said">{said}</span>
			{alt ? <span className="flow-report-figure-missing-alt">{alt}</span> : null}
		</Card>
	);
}
