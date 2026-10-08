import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ProgressBar, StatusProgress } from "../../index";

export function ProgressDemo(): ReactElement {
	return (
		<div className="wg-showcase-stack">
			<ProgressBar value={64} label="Loaded" />
			<StatusProgress value={0} label="Not started" />
			<StatusProgress value={45} label="Running" />
			<StatusProgress value={100} label="Done" />
			<div className="wg-showcase-row">
				<ProgressBar shape="circle" size={72} value={72} label="Backup" displayValue={({ value }) => `${value}%`} />
				<StatusProgress shape="circle" size={72} value={100} label="Synced" />
			</div>
		</div>
	);
}
