import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import type { ChatCards, PinnedCard } from "@widgetarium/core/engine/assistant-cards.js";
import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import type { Report } from "../failure-line.js";
import { BuildProgress } from "./build-progress.js";
import type { OpenByBuild } from "./build-progress.js";
import { BuildRunCard } from "./build-run-card.js";
import { changeAttachmentOf } from "./change-attachment.js";
import type { Attachment } from "./change-attachment.js";
import { DesignCard } from "./design-card.js";
import { PinnedRun } from "./pinned-run.js";
import { SpecCard } from "./spec-card.js";

export interface CardAsks {
	readonly port: AssistantPort;
	readonly report: Report;
	buildIt(app: string): void;
	approveDesign(app: string): void;
	attach(attachment: Attachment): void;
}

export interface PinnedAsks {
	readonly port: AssistantPort;
	readonly openByBuild: OpenByBuild;
	readonly showCard: (key: string) => void;
}

export interface CardsAround {
	readonly before: readonly ReactNode[];
	readonly after: readonly ReactNode[];
}

export interface TurnAt {
	readonly at: number;
	readonly isAnswerable: boolean;
}

const NOT_OPENED = "the design of {app} could not be opened";
const NO_CARDS_AROUND: CardsAround = { before: [], after: [] };

export function cardsAround(cards: ChatCards, { at, isAnswerable }: TurnAt, asks: CardAsks): CardsAround {
	const turn = cards.ofTurns[at];
	if (!turn) return NO_CARDS_AROUND;
	const { port, report } = asks;
	const build = turn.build
		? h(BuildRunCard, { key: `${turn.build.run.key}-${at}`, card: turn.build, files: port, jobs: port, report })
		: null;
	return {
		before: [build],
		after: [
			specCardOf(turn.specApp, { at, isAnswerable }, asks),
			designCardOf(turn.designApp, { at, isAnswerable }, asks),
		],
	};
}

export function pinnedCardOf(
	pinned: PinnedCard | null,
	{ port, openByBuild, showCard }: PinnedAsks,
): ReactElement | null {
	if (!pinned) return null;
	if (pinned.kind === "run") return h(PinnedRun, { run: pinned.run, builds: pinned.builds, showCard });
	return h(BuildProgress, { key: pinned.build.key, build: pinned.build, progress: port.progressWidget(), openByBuild });
}

function specCardOf(app: string | null, { at, isAnswerable }: TurnAt, asks: CardAsks): ReactElement | null {
	if (!app) return null;
	return h(SpecCard, {
		key: `spec-${at}-${app}`,
		app,
		files: asks.port,
		isAnswerable,
		onBuild: () => asks.buildIt(app),
		onChange: () => asks.attach(changeAttachmentOf(app, "spec")),
	});
}

function designCardOf(app: string | null, { at, isAnswerable }: TurnAt, asks: CardAsks): ReactElement | null {
	if (!app) return null;
	return h(DesignCard, {
		key: `design-${at}-${app}`,
		app,
		files: asks.port,
		isAnswerable,
		onOpen: () => void asks.report(asks.port.openDesign(app), NOT_OPENED.replace("{app}", app)),
		onApprove: () => asks.approveDesign(app),
		onChange: () => asks.attach(changeAttachmentOf(app, "design")),
	});
}
