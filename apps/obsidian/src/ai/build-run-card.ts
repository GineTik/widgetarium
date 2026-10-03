import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { keptFeaturesOf } from "@widgetarium/core/app-spec.js";
import type { AppSpec, BuildStage } from "@widgetarium/core/app-spec.js";
import { useSpec } from "./use-spec.js";
import { SpecTitle } from "./spec-title.js";
import { pressableRow, rowText } from "./spec-rows.js";
import type { BuildRun, StageRow } from "./spec-calls.js";
import type { SpecPort } from "./spec-port.js";

export interface BuildRunCardProps {
	readonly run: BuildRun;
	readonly port: SpecPort;
}

const BUILDING = "Building {app}";
const BUILT = "Built {app}";
const SIZE = "{features} features · {pages} pages";
const STAGE_NAMES: Readonly<Record<BuildStage, string>> = {
	data: "Data",
	design: "Design",
	widgets: "Widgets",
	pages: "Pages",
};
const NO_WIDGET = "no widget named yet";

export function BuildRunCard({ run, port }: BuildRunCardProps): ReactElement {
	const spec = useSpec(port, run.app).read?.spec ?? null;
	const [isOpen, setOpen] = useState(false);
	const isDone = run.rows.every((row) => row.status === "done");
	const widgets = { spec, isOpen, onToggle: () => setOpen(!isOpen) };
	return h("section", { className: "wg-ai-spec" }, [
		h(SpecTitle, { key: "title", title: (isDone ? BUILT : BUILDING).replace("{app}", run.app), said: sizeOf(spec) }),
		h(
			"div",
			{ key: "plate", className: "wg-ai-spec-plate" },
			run.rows.map((row) => (row.stage === "widgets" ? widgetsRows(row, widgets) : stageLine(row))),
		),
	]);
}

function sizeOf(spec: AppSpec | null): string | null {
	if (!spec) return null;
	return SIZE.replace("{features}", String(keptFeaturesOf(spec).length)).replace("{pages}", String(spec.pages.length));
}

function stageLine(row: StageRow): ReactElement {
	return h("div", { key: row.stage, className: `wg-ai-spec-row is-${row.status}` }, stageParts(row));
}

function stageParts(row: StageRow): ReactElement[] {
	const dot = row.status === "done" ? h(Icon, { name: "tick", size: 16 }) : null;
	return [
		h("span", { key: "dot", className: `wg-ai-stage-dot is-${row.status}` }, dot),
		rowText(STAGE_NAMES[row.stage], row.said || null),
	];
}

interface WidgetsOpen {
	readonly spec: AppSpec | null;
	readonly isOpen: boolean;
	readonly onToggle: () => void;
}

function widgetsRows(row: StageRow, { spec, isOpen, onToggle }: WidgetsOpen): ReactElement {
	const features = isOpen && spec ? keptFeaturesOf(spec) : [];
	return h("div", { key: row.stage, className: "wg-ai-stage-widgets" }, [
		pressableRow({ isOpen, onToggle, className: `is-${row.status}` }, stageParts(row)),
		...features.map((feature) =>
			h(
				"div",
				{ key: feature.title, className: "wg-ai-spec-row is-inner" },
				rowText(feature.title, feature.widget ?? NO_WIDGET),
			),
		),
	]);
}
