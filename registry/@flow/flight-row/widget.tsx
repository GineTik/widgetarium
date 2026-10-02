import { IQuery, createWidget, defineLayout, defineMetadata, z } from "widgetarium";
import { Row, RowLabel } from "widgetarium/kit";
import { Mark } from "./mark";
import { Meta } from "./meta";
import { textOf } from "./text-of";
import { Trail } from "./trail";

const CSS = `
:is(.wg-root, .wg-portal) .wg-kit-row.flow-row {
	--flow-stage-w: 88px;
	--flow-time-w: 48px;
	--flow-face-w: 24px;
	flex-wrap: wrap;
	row-gap: var(--size-2-1, 2px);
	padding: 0;
	min-width: 0;
}

.flow-row-mark {
	order: 0;
	flex: none;
	box-sizing: border-box;
	width: 10px;
	height: 10px;
	border-radius: var(--wg-kit-pill);
	background: var(--wg-kit-neutral);
}

.flow-row-mark.is-running { background: var(--wg-kit-accent); }

.flow-row-mark.is-waiting {
	background: transparent;
	border: 2px solid var(--wg-kit-info);
}

.flow-row-mark.is-blocked {
	border-radius: 0;
	background: var(--wg-kit-warning);
}

.flow-row-mark.is-failed {
	border-radius: 0;
	background: transparent;
	border: 2px solid var(--wg-kit-error);
}

.flow-row-mark.is-done {
	border-radius: 0;
	background: var(--wg-kit-success);
	transform: rotate(45deg);
}

.flow-row-under { display: contents; }

.flow-row-meta {
	order: 1;
	display: flex;
	flex: 1 1 100%;
	align-items: center;
	gap: var(--size-2-2, 4px);
	overflow: hidden;
	min-width: 0;
	font-size: var(--font-ui-smaller, 12px);
	line-height: var(--line-height-tight, 1.25);
	color: var(--text-faint);
}

.flow-row-part {
	overflow: hidden;
	flex: 0 1 auto;
	min-width: 0;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.flow-row-part.is-branch { font-family: var(--font-monospace); }

.flow-row-sep { flex: none; }

.flow-row-cell {
	display: flex;
	overflow: hidden;
	align-items: center;
	min-width: 0;
}

.flow-row-cell.is-stage { width: var(--flow-stage-w); }

.flow-row-cell.is-time {
	justify-content: flex-end;
	width: var(--flow-time-w);
	white-space: nowrap;
	font-family: var(--font-monospace);
	font-size: var(--font-ui-smaller, 12px);
}

.flow-row-cell.is-face {
	justify-content: flex-end;
	width: var(--flow-face-w);
}

.flow-row-face {
	display: grid;
	place-content: center;
	box-sizing: border-box;
	width: var(--flow-face-w);
	height: var(--flow-face-w);
	border-radius: var(--wg-kit-pill);
	background: var(--wg-kit-fill);
	font-size: var(--font-ui-smaller, 12px);
	font-weight: var(--font-semibold, 600);
}

@container widget (width < 420px) {
	:is(.wg-root, .wg-portal) .wg-kit-row.flow-row .flow-row-under {
		order: 1;
		display: flex;
		flex: 1 1 100%;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--size-2-2, 4px);
		min-width: 0;
	}

	.flow-row-under .flow-row-meta {
		order: 0;
		flex: 0 1 auto;
	}

	:is(.wg-root, .wg-portal) .flow-row .flow-row-under .wg-kit-row-value { flex: 0 1 auto; }

	.flow-row-under .flow-row-cell { width: auto; }

	.flow-row-under .flow-row-cell:empty { display: none; }
}
`;

const UNTITLED = "Untitled";

export const FlightSchema = z.object({
	title: z.string().nullish(),
	status: z.string().nullish(),
	stage: z.string().nullish(),
	project: z.string().nullish(),
	branch: z.string().nullish(),
	activity: z.string().nullish(),
	elapsed: z.string().nullish(),
	who: z.string().nullish(),
});

const FlightRow = createWidget({
	inject: {
		getFlight: IQuery.expects(
			FlightSchema.default({
				title: "Rewrite the board tree reader",
				status: "running",
				stage: "build",
				project: "widgetarium",
				branch: "unsafe-dev",
				activity: "compiling widgets",
				elapsed: "12m",
				who: "Dana Reid",
			}),
		),
	},
	draw: ({ getFlight: flight }) => {
		const title = textOf(flight.title) ?? UNTITLED;

		return (
			<Row className="flow-row">
				<style>{CSS}</style>
				<Mark status={textOf(flight.status)} />
				<RowLabel title={title}>{title}</RowLabel>
				<div className="flow-row-under">
					<Meta flight={flight} />
					<Trail flight={flight} />
				</div>
			</Row>
		);
	},
});

export const metadata = defineMetadata(FlightRow, {
	title: "Flight row",
	description: "One piece of work in flight: where it stands, what it is doing, how long it has been going.",
	keywords: [
		"flight",
		"row",
		"run",
		"job",
		"task",
		"status",
		"stage",
		"branch",
		"project",
		"elapsed",
		"activity",
		"agent",
		"pipeline",
		"build",
	],
	preview: {
		size: { w: 5, h: 1 },
		props: {
			getFlight: {
				value: {
					title: "Rewrite the board tree reader",
					status: "running",
					stage: "build",
					project: "widgetarium",
					branch: "unsafe-dev",
					activity: "compiling widgets",
					elapsed: "12m",
					who: "Dana Reid",
				},
			},
		},
	},
	props: {
		getFlight: {
			label: "Flight",
			aka: ["flight"],
			hint: "The work this row draws. Held in a list it is handed down; standing alone it is the one typed here.",
		},
	},
});

export const layout = defineLayout({
	role: "detail",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 160, stackBelowPx: 420 },
});

// TRADE-OFF: the kit row's own padding is dropped, because the item plate around it already pads
export default FlightRow;
