import { useEffect, useLayoutEffect, useState } from "react";
import type { RefObject } from "react";
import type { StudioHostPort } from "@widgetarium/core/engine/studio-host.js";

const INSET_LEFT = "--wg-studio-inset-left";
const INSET_RIGHT = "--wg-studio-inset-right";

export function useWritesHostInsets(frame: RefObject<HTMLDivElement | null>, studio: StudioHostPort): void {
	const [{ left, right }, setInsets] = useState(() => studio.insets());
	useEffect(() => studio.onInsets(() => setInsets(studio.insets())), [studio]);
	useLayoutEffect(() => {
		const style = frame.current?.style;
		if (!style) return;
		style.setProperty(INSET_LEFT, `${left}px`);
		style.setProperty(INSET_RIGHT, `${right}px`);
	}, [frame, left, right]);
}
