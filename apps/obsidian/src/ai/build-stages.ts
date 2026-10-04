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
};

export function stageRing(status: StageStatus | ItemStatus, size: number, value = STAGE_VALUES[status]): ReactElement {
	const ring = { shape: "circle" as const, size, value, isWavy: false };
	return h(StatusProgress, { key: "ring", ...ring, className: `wg-ai-stage-ring is-${status}` });
}

export function buildShareOf(build: Build): number {
	const done = build.steps.filter((step) => step.status === "done").length;
	return build.steps.length === 0 ? 0 : Math.round((100 * done) / build.steps.length);
}

export function buildStatusOf(build: Build): ItemStatus {
	if (build.isLive) return "active";
	return build.steps.every((step) => step.status === "done") ? "done" : "failed";
}

export function buildSaidOf(build: Build): string {
	const active = build.steps.find((step) => step.status === "active" || step.status === "failed");
	return active ? active.label : BUILT_SAID;
}

export function stageDoneShare(rows: readonly StageRow[]): number {
	return Math.round((100 * rows.filter((row) => row.status === "done").length) / Math.max(rows.length, 1));
}

const BUILT_SAID = "Built and placed";
