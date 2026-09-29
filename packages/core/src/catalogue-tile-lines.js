import { createElement as h } from "react";
import { fillLine } from "./catalogue-entries.js";

const WRITING = "Writing {done} of {total} files";

const FETCHING = "Fetching";

const OUTDATED = "{here} here · {there} out";

const MOVED_TO = "This registry moved to {movedTo}; newer versions are published there.";

export function TileLines({ entry, state, step, failure, lacks }) {
	const description = entry.manifest?.description;
	return [
		state === "busy"
			? h("p", { className: "wg-cat-step", key: "step" }, step?.total > 0 ? fillLine(WRITING, step) : FETCHING)
			: null,
		state !== "busy" && entry.update
			? h("p", { className: "wg-cat-step", key: "update" }, fillLine(OUTDATED, entry.update))
			: null,
		// TRADE-OFF: the sentence lives on the card, because there is no detail page to hold it
		description ? h("p", { className: "wg-cat-what", key: "what" }, description) : null,
		entry.manifest?.movedTo
			? h("p", { className: "wg-cat-lack", key: "moved" }, MOVED_TO.replace("{movedTo}", entry.manifest.movedTo))
			: null,
		failure ? h("p", { className: "wg-cat-lack is-failure", key: "failure" }, failure) : null,
		lacks ? h("p", { className: "wg-cat-lack", key: "lack" }, lacks) : null,
	];
}
