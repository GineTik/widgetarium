import { createElement as h } from "react";
import type { ReactElement } from "react";
import { STAGE_NAMES, buildSaidOf, stageDoneShare, stageRing } from "./build-stages.js";
import { rowText } from "./spec-rows.js";
import type { Build } from "./builds.js";
import type { BuildRun } from "./spec-calls.js";

export interface PinnedRunProps {
	readonly run: BuildRun;
	readonly builds: readonly Build[];
}

const WHERE = "{app} · {at} of {all}";
const NOW = "{stage} · {doing}";
const PINNED_RING_PX = 26;

export function PinnedRun({ run, builds }: PinnedRunProps): ReactElement {
	const activeAt = run.rows.findIndex((row) => row.status !== "done");
	const at = activeAt < 0 ? run.rows.length : activeAt + 1;
	const where = WHERE.replace("{app}", run.app).replace("{at}", String(at)).replace("{all}", String(run.rows.length));
	const showCard = (): void => scrollToCard(run.key);
	return h("button", { type: "button", className: "wg-ai-pinned-run", "aria-live": "polite", onClick: showCard }, [
		stageRing("active", PINNED_RING_PX, Math.max(stageDoneShare(run.rows), 10)),
		rowText(where, doingOf(run, builds, activeAt)),
	]);
}

export function scrollToCard(key: string): void {
	const card = [...document.querySelectorAll<HTMLElement>("[data-build-key]")].find(
		(node) => node.dataset["buildKey"] === key,
	);
	card?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function doingOf(run: BuildRun, builds: readonly Build[], activeAt: number): string | null {
	const row = run.rows[activeAt];
	if (!row) return null;
	const live = row.stage === "widgets" ? builds.find((build) => build.isLive) : undefined;
	const doing = live ? `${live.name} · ${buildSaidOf(live)}` : null;
	return doing ? NOW.replace("{stage}", STAGE_NAMES[row.stage]).replace("{doing}", doing) : STAGE_NAMES[row.stage];
}
