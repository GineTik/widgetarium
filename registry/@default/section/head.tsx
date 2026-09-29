import type { MountEntry } from "widgetarium";
import { Pill } from "widgetarium/kit";
import { Controls } from "./controls";

type HeadProps = {
	heading: string;
	badge: string;
	badgeTone: string;
	controls: readonly MountEntry[];
};

export function Head({ heading, badge, badgeTone, controls }: HeadProps) {
	return (
		<div className="wg-section-head">
			<h2 className="wg-section-title">{heading}</h2>
			{badge ? <Pill tone={badgeTone}>{badge}</Pill> : null}
			<Controls held={controls} />
		</div>
	);
}
