import { createElement as h, useMemo, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import {
	SCROLL_EDGE_THRESHOLD_PX,
	SCROLL_POSITION_WORD,
	SCROLL_PREVIOUS_ITEM_PEEK_PX,
} from "../constants/message-scroller";
import type { ScrollPosition } from "../constants/message-scroller";
import { createScrollEngine, OPENING_REPORT } from "../utils/message-scroll-engine";
import type { ScrollReport, ScrollSettings } from "../utils/message-scroll-engine";
import { wornWord } from "../utils/surface";
import { MessageScrollerContext } from "./message-scroller-context";

export interface MessageScrollerProviderProps {
	readonly autoScroll?: boolean | undefined;
	readonly defaultScrollPosition?: ScrollPosition | undefined;
	readonly scrollEdgeThreshold?: number | undefined;
	readonly scrollMargin?: number | undefined;
	readonly scrollPreviousItemPeek?: number | undefined;
	readonly children?: ReactNode;
}

type ProviderSettings = Omit<ScrollSettings, "preserveScrollOnPrepend">;

export function MessageScrollerProvider({
	autoScroll = false,
	defaultScrollPosition,
	scrollEdgeThreshold = SCROLL_EDGE_THRESHOLD_PX,
	scrollMargin = 0,
	scrollPreviousItemPeek = SCROLL_PREVIOUS_ITEM_PEEK_PX,
	children,
}: MessageScrollerProviderProps): ReactElement {
	const said: ProviderSettings = {
		autoScroll,
		defaultScrollPosition: wornWord(defaultScrollPosition, SCROLL_POSITION_WORD),
		scrollEdgeThreshold,
		scrollMargin,
		scrollPreviousItemPeek,
	};
	const settings = useRef(said);
	settings.current = said;
	const preserve = useRef(true);
	const [report, setReport] = useState<ScrollReport>(OPENING_REPORT);
	const [engine] = useState(() =>
		createScrollEngine(
			() => ({ ...settings.current, preserveScrollOnPrepend: preserve.current }),
			(next) => setReport((was) => (isSameReport(was, next) ? was : next)),
		),
	);
	const state = useMemo(
		() => ({ engine, report, setPreserveOnPrepend: (isPreserved: boolean) => (preserve.current = isPreserved) }),
		[engine, report],
	);
	return <MessageScrollerContext.Provider value={state}>{children}</MessageScrollerContext.Provider>;
}

function isSameReport(was: ScrollReport, next: ScrollReport): boolean {
	return (
		was.start === next.start &&
		was.end === next.end &&
		was.autoscrolling === next.autoscrolling &&
		was.pending === next.pending &&
		was.currentAnchorId === next.currentAnchorId &&
		was.visibleMessageIds.join("\n") === next.visibleMessageIds.join("\n")
	);
}
