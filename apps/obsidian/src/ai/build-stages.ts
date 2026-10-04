import { createElement as h } from "react";
import type { ReactElement } from "react";
import { StatusProgress } from "@widgetarium/kit";
import type { BuildStage } from "@widgetarium/core/app-spec.js";
import type { Build } from "./builds.js";
import type { ItemStatus, StageRow, StageStatus } from "./spec-calls.js";

export const STAGE_NAMES: Readonly<Record<BuildStage, string>> = {
	data: "Data",
	design: "Design",
	catalogue: "From the catalogue",
	widgets: "New widgets",
	pages: "Pages",
};

const STAGE_VALUES: Readonly<Record<StageStatus | ItemStatus, number>> = {
	done: 100,
	active: 40,
	pending: 0,
	failed: 0,
	cancelled: 0,
};

export function stageRing(status: StageStatus | ItemStatus, size: number, value = STAGE_VALUES[status]): ReactElement {
	const ring = { shape: "circle" as const, size, value, isWavy: false };
	return h(StatusProgress, { key: "ring", ...ring, className: `wg-ai-stage-ring is-${status}` });
}

export function buildShareOf(build: Build): number {
	const done = build.steps.filter((step) => step.status === "done").length;
	return build.steps.length === 0 ? 0 : Math.round((100 * done) / build.steps.length);
}

export interface BuildSettling {
	readonly isRunning: boolean;
	readonly isStageDone: boolean;
}

export function buildStatusOf(build: Build, { isRunning, isStageDone }: BuildSettling): ItemStatus {
	if (build.steps.some((step) => step.status === "failed")) return "failed";
	if (isStageDone || build.steps.every((step) => step.status === "done")) return "done";
	return build.isLive || isRunning ? "active" : "cancelled";
}

export function buildSaidOf(build: Build, status: ItemStatus = "active"): string {
	if (status === "cancelled") return CANCELLED_SAID;
	if (status === "done") return BUILT_SAID;
	const active = build.steps.find((step) => step.status === "active" || step.status === "failed");
	return active ? active.label : BUILT_SAID;
}

export function latestPerWidget(builds: readonly Build[]): Build[] {
	const latest = new Map<string, Build>();
	for (const build of builds) {
		const held = latest.get(build.widget);
		if (!held || build.startedAt >= held.startedAt) latest.set(build.widget, build);
	}
	return [...latest.values()].sort((one, other) => one.startedAt - other.startedAt);
}

export function stageDoneShare(rows: readonly StageRow[]): number {
	return Math.round((100 * rows.filter((row) => row.status === "done").length) / Math.max(rows.length, 1));
}

const BUILT_SAID = "Built and placed";
const CANCELLED_SAID = "Cancelled — the run ended before it was built";
