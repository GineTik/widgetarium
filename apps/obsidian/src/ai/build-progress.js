import { createElement as h, useEffect, useMemo, useRef } from "react";
import { drawWidget } from "@widgetarium/core/mounted.js";
import { arrayGateway, soloGateway } from "@widgetarium/core/gateway/create.ts";
import { TASK_PROGRESS } from "./builds.js";

const PROGRESS_MISSING = "{widget} is not in this vault, so the steps of {title} cannot be drawn.";

export function BuildProgress({ build, progress, openByBuild }) {
	const gateways = useProgressGateways(build, openByBuild);

	if (!progress?.definition) {
		return h("div", { className: "wg-ai-build is-missing" }, [
			h("span", { key: "said" }, PROGRESS_MISSING.replace("{widget}", TASK_PROGRESS).replace("{title}", build.widget)),
			progress?.refusal ? h("span", { key: "why", className: "wg-ai-build-why" }, progress.refusal) : null,
		]);
	}
	return h("div", { className: "wg-ai-build" }, drawWidget(progress.definition, gateways));
}

function useProgressGateways(build, openByBuild) {
	const latest = useRef(build);
	latest.current = build;
	const listeners = useMemo(() => new Set(), []);
	const gateways = useMemo(
		() => progressGateways(build.key, latest, openByBuild, listeners),
		[build.key, openByBuild, listeners],
	);
	const fingerprint = JSON.stringify(build);

	useEffect(() => {
		for (const listener of listeners) listener({});
	}, [fingerprint, listeners]);

	return gateways;
}

function progressGateways(key, latest, openByBuild, listeners) {
	const held = { id: `ai-build/${key}`, latest, subscribe: subscriberTo(listeners) };
	return {
		title: createFieldGateway(held, "title"),
		startedAt: createFieldGateway(held, "startedAt"),
		endedAt: createFieldGateway(held, "endedAt"),
		steps: createStepsGateway(held),
		open: openGateway(held.id, key, openByBuild),
	};
}

function subscriberTo(listeners) {
	return (listener) => {
		listeners.add(listener);
		return () => listeners.delete(listener);
	};
}

function createFieldGateway({ id, latest, subscribe }, field) {
	return soloGateway(() => latest.current[field], {}, `${id}/${field}`, { subscribe });
}

function createStepsGateway({ id, latest, subscribe }) {
	return arrayGateway(() => latest.current.steps, {}, `${id}/steps`, { subscribe });
}

function openGateway(id, key, openByBuild) {
	return soloGateway(
		() => openByBuild.get(key) === true,
		{ update: (next) => openByBuild.set(key, next === true) },
		`${id}/open`,
	);
}
