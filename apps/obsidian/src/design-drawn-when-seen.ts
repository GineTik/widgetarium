import { createContext, createElement as h, useContext, useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { useMountedInTurn } from "./design-mount-turns.js";
import { askForSnapshot, useFramePicture } from "./design-snapshots.js";
import { useIsFar } from "widgetarium/studio";

export interface DrawnWhenSeenProps {
	readonly minHeight: number;
	readonly frame: string;
	readonly pictureKey: string;
	readonly children?: ReactNode;
}

export const DRAWS_AT_ONCE = createContext(false);

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
	useAsksForSnapshot(isMounted && !isAtOnce && !isFresh ? live : null, frame, pictureKey);
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

function useAsksForSnapshot(drawn: HTMLDivElement | null, frame: string, key: string): void {
	useEffect(() => {
		if (drawn) askForSnapshot(frame, key, () => drawn);
	}, [drawn, frame, key]);
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
