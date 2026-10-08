import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Sparkline, SparklineArea, SparklineBars, SparklineDot, SparklineLine } from "../../index";
import { Named } from "../frame/named";
import { WEEKS } from "../showcase-data";

const SPOKEN = "Notes, twelve weeks";

export function SparklinesDemo(): ReactElement {
	return (
		<div className="wg-showcase-stack">
			<Named name="SparklineLine · SparklineDot">
				<Sparkline data={WEEKS} label={SPOKEN}>
					<SparklineLine />
					<SparklineDot at="last" />
				</Sparkline>
			</Named>
			<Named name="SparklineArea · color success">
				<Sparkline data={WEEKS} color="success" label={SPOKEN}>
					<SparklineArea />
					<SparklineLine />
				</Sparkline>
			</Named>
			<Named name="SparklineBars">
				<Sparkline data={WEEKS} color={2} label={SPOKEN}>
					<SparklineBars />
				</Sparkline>
			</Named>
			<Named name="SparklineDot at min and max">
				<Sparkline data={WEEKS} color="neutral" label={SPOKEN}>
					<SparklineLine />
					<SparklineDot at="min" />
					<SparklineDot at="max" />
				</Sparkline>
			</Named>
		</div>
	);
}
