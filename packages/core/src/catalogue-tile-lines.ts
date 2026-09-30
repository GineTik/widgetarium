import { createElement as h } from "react";
import type { ReactElement } from "react";
import { fillLine } from "./catalogue-entries.js";
import type { MergedEntry } from "./catalogue-entries.js";
import type { FetchProgress } from "./engine/widget-source.js";
import type { PressState } from "./catalogue-install-press.js";

export interface TileLinesProps {
	readonly entry: MergedEntry;
	readonly state: PressState;
	readonly step: FetchProgress | null;
	readonly failure: string | null;
	readonly lacks: string | null;
}

const WRITING = "Writing {done} of {total} files";

const FETCHING = "Fetching";

const OUTDATED = "{here} here · {there} out";

const MOVED_TO = "This registry moved to {movedTo}; newer versions are published there.";

export function TileLines({ entry, state, step, failure, lacks }: TileLinesProps): (ReactElement | null)[] {
	const description = entry.manifest["description"];
	const movedTo = entry.manifest["movedTo"];
	return [
		state === "busy"
			? h("p", { className: "wg-cat-step", key: "step" }, step && step.total > 0 ? fillLine(WRITING, step) : FETCHING)
			: null,
		state !== "busy" && entry.update
			? h("p", { className: "wg-cat-step", key: "update" }, fillLine(OUTDATED, entry.update))
			: null,
		// TRADE-OFF: the sentence lives on the card, because there is no detail page to hold it
		description ? h("p", { className: "wg-cat-what", key: "what" }, String(description)) : null,
		movedTo ? h("p", { className: "wg-cat-lack", key: "moved" }, MOVED_TO.replace("{movedTo}", String(movedTo))) : null,
		failure ? h("p", { className: "wg-cat-lack is-failure", key: "failure" }, failure) : null,
		lacks ? h("p", { className: "wg-cat-lack", key: "lack" }, lacks) : null,
	];
}
