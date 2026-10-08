import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import {
	SCROLL_EDGE_THRESHOLD_PX,
	SCROLL_POSITION_WORD,
	SCROLL_PREVIOUS_ITEM_PEEK_PX,
} from "../constants/message-scroller";
import type { ScrollPosition } from "../constants/message-scroller";
import { useScrollerEngine } from "../hooks/use-scroller-engine";
import type { ProviderSettings } from "../hooks/use-scroller-engine";
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

type ScrollerAsk = Omit<MessageScrollerProviderProps, "children">;

type ScrollDistance = "scrollEdgeThreshold" | "scrollMargin" | "scrollPreviousItemPeek";

export function MessageScrollerProvider({ children, ...asked }: MessageScrollerProviderProps): ReactElement {
	const state = useScrollerEngine(providerSettingsOf(asked));
	return <MessageScrollerContext.Provider value={state}>{children}</MessageScrollerContext.Provider>;
}

function providerSettingsOf(asked: ScrollerAsk): ProviderSettings {
	return {
		autoScroll: asked.autoScroll ?? false,
		defaultScrollPosition: wornWord(asked.defaultScrollPosition, SCROLL_POSITION_WORD),
		...scrollDistancesOf(asked),
	};
}

function scrollDistancesOf(asked: ScrollerAsk): Pick<ProviderSettings, ScrollDistance> {
	return {
		scrollEdgeThreshold: asked.scrollEdgeThreshold ?? SCROLL_EDGE_THRESHOLD_PX,
		scrollMargin: asked.scrollMargin ?? 0,
		scrollPreviousItemPeek: asked.scrollPreviousItemPeek ?? SCROLL_PREVIOUS_ITEM_PEEK_PX,
	};
}
