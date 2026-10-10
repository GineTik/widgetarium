import { createContext, createElement as h, useContext, useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { useMountedInTurn } from "./design-mount-turns.js";
import { askForSnapshot, useFramePicture } from "./design-snapshots.js";
import { useIsFar } from "../canvas/zoom-settled.js";
import type { PictureTaker } from "@widgetarium/core/engine/design-port.js";

export interface DrawnWhenSeenProps {
	readonly minHeight: number;
	readonly frame: string;
	readonly pictureKey: string;
	readonly children?: ReactNode;
}

export const DRAWS_AT_ONCE = createContext(false);

export const TAKES_PICTURES = createContext<PictureTaker | null>(null);

const FIELD = ".wg-design-field";
const SEEN_AHEAD = "50%";

export function DrawnWhenSeen({ minHeight, frame, pictureKey, children }: DrawnWhenSeenProps): ReactElement {
	const [node, setNode] = useState<HTMLDivElement | null>(null);
	const [live, setLive] = useState<HTMLDivElement | null>(null);
	const isAtOnce = useContext(DRAWS_AT_ONCE);
	const isMounted = useMountedInTurn(useIsSeen(node)) || isAtOnce;
	const picture = useFramePicture(frame);
	const isFresh = picture?.key === pictureKey;
	const isPicture = useIsFar() && picture !== undefined && !isAtOnce;
	const pictureOf = useContext(TAKES_PICTURES);
	useAsksForSnapshot(isMounted && !isAtOnce && !isFresh ? live : null, frame, pictureKey, pictureOf);
	const isLiveDrawn = isMounted && !(isPicture && isFresh);
	return h(
		"div",
		{ ref: setNode, className: "wg-design-seen", style: isMounted ? undefined : { minHeight: `${minHeight}px` } },
		[
			isPicture
				? h("img", { key: "picture", className: "wg-design-snapshot", src: picture.url, alt: "", draggable: false })
				: null,
			isLiveDrawn
				? h("div", { key: "live", ref: setLive, className: isPicture ? "wg-design-refreshing" : undefined }, children)
				: null,
		],
	);
}

function useAsksForSnapshot(
	drawn: HTMLDivElement | null,
	frame: string,
	key: string,
	pictureOf: PictureTaker | null,
): void {
	useEffect(() => {
		if (drawn && pictureOf) askForSnapshot(frame, { key, nodeOf: () => drawn, pictureOf });
	}, [drawn, frame, key, pictureOf]);
}

function useIsSeen(node: HTMLDivElement | null): boolean {
	const [isSeen, setSeen] = useState(false);
	useEffect(() => {
		if (!node || isSeen) return;
		const watcher = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) setSeen(true);
			},
			{ root: node.closest(FIELD), rootMargin: SEEN_AHEAD },
		);
		watcher.observe(node);
		return () => watcher.disconnect();
	}, [node, isSeen]);
	return isSeen;
}
