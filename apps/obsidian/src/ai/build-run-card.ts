import { createElement as h } from "react";
import type { ReactElement } from "react";
import { List, Row } from "@widgetarium/kit";
import { keptFeaturesOf } from "@widgetarium/core/app-spec.js";
import type { AppSpec } from "@widgetarium/core/app-spec.js";
import { useSpec } from "./use-spec.js";
import { SpecTitle } from "./spec-title.js";
import { foldChevron, foldOf, rowText, useFolds } from "./spec-rows.js";
import type { Fold } from "./spec-rows.js";
import { STAGE_NAMES, buildSaidOf, buildShareOf, buildStatusOf, latestPerWidget, stageRing } from "./build-stages.js";
import type { BuildSettling } from "./build-stages.js";
import type { Build } from "./builds.js";
import type { BuildRun, InstallRow, StageRow } from "./spec-calls.js";
import type { SpecPort } from "./spec-port.js";

export interface BuildRunCardProps {
	readonly run: BuildRun;
	readonly port: SpecPort;
	readonly builds: readonly Build[];
	readonly installs: readonly InstallRow[];
	readonly isRunning?: boolean;
}

const BUILDING = "Building {app}";
const BUILT = "Built {app}";
const SIZE = "{features} features · {pages} pages";
const INSTALL_SAID = {
	done: "installed",
	active: "installing",
	failed: "could not be installed",
	cancelled: "not installed",
} as const;
const RESEARCH = "Research";
const LOOKED_AT = "Looked at {products}";
const STAGE_RING_PX = 28;
const ITEM_RING_PX = 22;

export function BuildRunCard({ run, port, builds, installs, isRunning = false }: BuildRunCardProps): ReactElement {
	const spec = useSpec(port, run.app).read?.spec ?? null;
	const isDone = run.rows.every((row) => row.status === "done");
	const settling = { isRunning, isStageDone: run.rows.some((row) => row.stage === "widgets" && row.status === "done") };
	const items = (row: StageRow): ReactElement[] =>
		itemRowsOf(row, { builds: latestPerWidget(builds), installs, settling });
	const title = (isDone ? BUILT : BUILDING).replace("{app}", run.app);
	const foldFor = useFolds();
	return h("section", { className: "wg-ai-spec", "data-build-key": run.key }, [
		h(SpecTitle, { key: "title", title, said: sizeOf(spec) }),
		h(List, { key: "stages" }, [
			researchRow(spec),
			...run.rows.map((row) => stageOf(row, items(row), foldFor(row.stage))),
		]),
	]);
}

function researchRow(spec: AppSpec | null): ReactElement | null {
	if (!spec || spec.research.length === 0) return null;
	const products = spec.research
		.filter((one) => one.kept)
		.map((one) => one.product)
		.join(", ");
	return h(Row, { key: "research", className: "is-done" }, [
		stageRing("done", STAGE_RING_PX),
		rowText(RESEARCH, LOOKED_AT.replace("{products}", products)),
	]);
}

function sizeOf(spec: AppSpec | null): string | null {
	if (!spec) return null;
	return SIZE.replace("{features}", String(keptFeaturesOf(spec).length)).replace("{pages}", String(spec.pages.length));
}

function stageOf(row: StageRow, items: ReactElement[], fold: Fold): ReactElement {
	const parts = [stageRing(row.status, STAGE_RING_PX), rowText(STAGE_NAMES[row.stage], row.said || null)];
	if (items.length === 0) return h(Row, { key: row.stage, className: `is-${row.status}` }, parts);
	const press = { type: "button", "aria-expanded": fold.isOpen, onClick: fold.onToggle };
	return h("div", { key: row.stage, className: "wg-ai-stage-fold" }, [
		h(
			Row,
			{ key: "line", asChild: true, pressable: true, className: `is-${row.status}` },
			h("button", press, [...parts, foldChevron(fold.isOpen)]),
		),
		foldOf(fold.isOpen, items),
	]);
}

interface StageItems {
	readonly builds: readonly Build[];
	readonly installs: readonly InstallRow[];
	readonly settling: BuildSettling;
}

function itemRowsOf(row: StageRow, { builds, installs, settling }: StageItems): ReactElement[] {
	if (row.stage === "catalogue") return installs.map(installRow);
	if (row.stage === "widgets") return builds.map((build) => widgetBuildRow(build, settling));
	return [];
}

function installRow(install: InstallRow): ReactElement {
	return h(Row, { key: install.key, className: `is-inner is-${install.status}` }, [
		stageRing(install.status, ITEM_RING_PX),
		rowText(install.widget, INSTALL_SAID[install.status]),
	]);
}

function widgetBuildRow(build: Build, settling: BuildSettling): ReactElement {
	const status = buildStatusOf(build, settling);
	return h(Row, { key: build.key, className: `is-inner is-${status}` }, [
		stageRing(status, ITEM_RING_PX, status === "active" ? Math.max(buildShareOf(build), 10) : undefined),
		rowText(build.name, buildSaidOf(build, status)),
	]);
}
