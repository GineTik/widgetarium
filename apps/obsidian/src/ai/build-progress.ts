import { createElement as h, useEffect, useMemo, useRef } from "react";
import type { MutableRefObject, ReactElement } from "react";
import { drawWidget } from "@widgetarium/core/mounted.js";
import { arrayGateway, soloGateway } from "@widgetarium/core/gateway/create.js";
import type { CollectionGateway, GatewayEvent, Unsubscribe, ValueGateway } from "@widgetarium/core/gateway/contract.js";
import type { EveryValueVerb } from "@widgetarium/core/gateway/needs.js";
import { TASK_PROGRESS } from "./builds.js";
import type { Build, BuildStep } from "./builds.js";
import type { ProgressWidget } from "./assistant.js";

export type OpenByBuild = Map<string, boolean>;

export interface BuildProgressProps {
	readonly build: Build;
	readonly progress: ProgressWidget | null | undefined;
	readonly openByBuild: OpenByBuild;
}

type Listener = (event: GatewayEvent) => void;

type ProgressGateways = {
	readonly title: ValueGateway<string, EveryValueVerb>;
	readonly startedAt: ValueGateway<number, EveryValueVerb>;
	readonly endedAt: ValueGateway<number, EveryValueVerb>;
	readonly steps: CollectionGateway<BuildStep>;
	readonly open: ValueGateway<boolean, EveryValueVerb>;
};

interface HeldBuild {
	readonly id: string;
	readonly latest: MutableRefObject<Build>;
	readonly subscribe: (listener: Listener) => Unsubscribe;
}

const PROGRESS_MISSING = "{widget} is not in this vault, so the steps of {title} cannot be drawn.";

export function BuildProgress({ build, progress, openByBuild }: BuildProgressProps): ReactElement {
	const gateways = useProgressGateways(build, openByBuild);
	const definition = progress?.definition;
	const component = definition?.component;

	if (!definition || !component) {
		return h("div", { className: "wg-ai-build is-missing" }, [
			h("span", { key: "said" }, PROGRESS_MISSING.replace("{widget}", TASK_PROGRESS).replace("{title}", build.widget)),
			progress?.refusal ? h("span", { key: "why", className: "wg-ai-build-why" }, progress.refusal) : null,
		]);
	}
	return h(
		"div",
		{ className: "wg-ai-build" },
		drawWidget({ component, draw: definition.draw, manifest: definition.manifest }, gateways),
	);
}

function useProgressGateways(build: Build, openByBuild: OpenByBuild): ProgressGateways {
	const latest = useRef(build);
	latest.current = build;
	const listeners = useMemo(() => new Set<Listener>(), []);
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

function progressGateways(
	key: string,
	latest: MutableRefObject<Build>,
	openByBuild: OpenByBuild,
	listeners: Set<Listener>,
): ProgressGateways {
	const held: HeldBuild = { id: `ai-build/${key}`, latest, subscribe: subscriberTo(listeners) };
	return {
		title: soloGateway(() => latest.current.title, {}, `${held.id}/title`, { subscribe: held.subscribe }),
		startedAt: soloGateway(() => latest.current.startedAt, {}, `${held.id}/startedAt`, { subscribe: held.subscribe }),
		endedAt: soloGateway(() => latest.current.endedAt, {}, `${held.id}/endedAt`, { subscribe: held.subscribe }),
		steps: arrayGateway(() => latest.current.steps, {}, `${held.id}/steps`, { subscribe: held.subscribe }),
		open: openGateway(held.id, key, openByBuild),
	};
}

function subscriberTo(listeners: Set<Listener>): (listener: Listener) => Unsubscribe {
	return (listener) => {
		listeners.add(listener);
		return () => listeners.delete(listener);
	};
}

function openGateway(id: string, key: string, openByBuild: OpenByBuild): ValueGateway<boolean, EveryValueVerb> {
	return soloGateway(
		() => openByBuild.get(key) === true,
		{ update: (next: unknown) => openByBuild.set(key, next === true) },
		`${id}/open`,
	);
}
