import { createContext, createElement as h, useContext, useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { useMountedInTurn } from "./design-mount-turns.js";
import { askForSnapshot, useSnapshot } from "./design-snapshots.js";
import { useIsFar } from "./design-zoom.js";

export interface DrawnWhenSeenProps {
	readonly minHeight: number;
	readonly pictureKey: string;
	readonly children?: ReactNode;
}

export const DRAWS_AT_ONCE = createContext(false);

const FIELD = ".wg-design-field";
const SEEN_AHEAD = "50%";

export function DrawnWhenSeen({ minHeight, pictureKey, children }: DrawnWhenSeenProps): ReactElement {
	const [node, setNode] = useState<HTMLDivElement | null>(null);
	const isAtOnce = useContext(DRAWS_AT_ONCE);
	const isMounted = useMountedInTurn(useIsSeen(node)) || isAtOnce;
	const picture = useSnapshot(pictureKey);
	const isPicture = useIsFar() && picture !== undefined && !isAtOnce;
	useAsksForSnapshot(isMounted && !isAtOnce && !picture ? node : null, pictureKey);
	return h(
		"div",
		{ ref: setNode, className: "wg-design-seen", style: isMounted ? undefined : { minHeight: `${minHeight}px` } },
		drawnOf({ isMounted, isPicture, picture, children }),
	);
}

function drawnOf({
	isMounted,
	isPicture,
	picture,
	children,
}: {
	readonly isMounted: boolean;
	readonly isPicture: boolean;
	readonly picture: string | undefined;
	readonly children?: ReactNode;
}): ReactNode {
	if (isPicture) return h("img", { className: "wg-design-snapshot", src: picture, alt: "", draggable: false });
	return isMounted ? children : null;
}

function useAsksForSnapshot(drawn: HTMLDivElement | null, key: string): void {
	useEffect(() => {
		if (drawn) askForSnapshot(key, () => drawn);
	}, [drawn, key]);
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
