import { createElement as h } from "react";
import type { ReactElement } from "react";
import { List, Row } from "@widgetarium/kit";
import { keptFeaturesOf } from "@widgetarium/core/app-spec.js";
import type { AppSpec } from "@widgetarium/core/app-spec.js";
import { useSpec } from "./use-spec.js";
import { SpecTitle } from "./spec-title.js";
import { rowText } from "./spec-rows.js";
import { STAGE_NAMES, buildSaidOf, buildShareOf, buildStatusOf, stageRing } from "./build-stages.js";
import type { Build } from "./builds.js";
import type { BuildRun, InstallRow, StageRow } from "./spec-calls.js";
import type { SpecPort } from "./spec-port.js";

export interface BuildRunCardProps {
	readonly run: BuildRun;
	readonly port: SpecPort;
	readonly builds: readonly Build[];
	readonly installs: readonly InstallRow[];
}

const BUILDING = "Building {app}";
const BUILT = "Built {app}";
const SIZE = "{features} features · {pages} pages";
const INSTALL_SAID = { done: "installed", active: "installing", failed: "could not be installed" } as const;
const STAGE_RING_PX = 28;
const ITEM_RING_PX = 22;

export function BuildRunCard({ run, port, builds, installs }: BuildRunCardProps): ReactElement {
	const spec = useSpec(port, run.app).read?.spec ?? null;
	const isDone = run.rows.every((row) => row.status === "done");
	const title = (isDone ? BUILT : BUILDING).replace("{app}", run.app);
	return h("section", { className: "wg-ai-spec" }, [
		h(SpecTitle, { key: "title", title, said: sizeOf(spec) }),
		h(
			List,
			{ key: "stages" },
			run.rows.flatMap((row) => [stageLine(row), ...itemRowsOf(row, builds, installs)]),
		),
	]);
}

function sizeOf(spec: AppSpec | null): string | null {
	if (!spec) return null;
	return SIZE.replace("{features}", String(keptFeaturesOf(spec).length)).replace("{pages}", String(spec.pages.length));
}

function stageLine(row: StageRow): ReactElement {
	return h(Row, { key: row.stage, className: `is-${row.status}` }, [
		stageRing(row.status, STAGE_RING_PX),
		rowText(STAGE_NAMES[row.stage], row.said || null),
	]);
}

function itemRowsOf(row: StageRow, builds: readonly Build[], installs: readonly InstallRow[]): ReactElement[] {
	if (row.stage === "catalogue") return installs.map(installRow);
	if (row.stage === "widgets") return builds.map(widgetBuildRow);
	return [];
}

function installRow(install: InstallRow): ReactElement {
	return h(Row, { key: install.key, className: `is-inner is-${install.status}` }, [
		stageRing(install.status, ITEM_RING_PX),
		rowText(install.widget, INSTALL_SAID[install.status]),
	]);
}

function widgetBuildRow(build: Build): ReactElement {
	const status = buildStatusOf(build);
	return h(Row, { key: build.key, className: `is-inner is-${status}` }, [
		stageRing(status, ITEM_RING_PX, status === "active" ? Math.max(buildShareOf(build), 10) : undefined),
		rowText(build.name, buildSaidOf(build)),
	]);
}
