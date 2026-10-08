import { useMessageScrollerState } from "../components/message-scroller-context";
import type { ScrollJump } from "../utils/message-scroll-engine";
import type { ScrollableEdges } from "../utils/message-scroll-geometry";

export interface MessageScrollerCommands {
	readonly scrollToMessage: (id: string, jump?: ScrollJump) => boolean;
	readonly scrollToEnd: (jump?: ScrollJump) => boolean;
	readonly scrollToStart: (jump?: ScrollJump) => boolean;
}

export interface MessageScrollerVisibility {
	readonly currentAnchorId: string | null;
	readonly visibleMessageIds: readonly string[];
}

export function useMessageScroller(): MessageScrollerCommands {
	const { engine } = useMessageScrollerState();
	return {
		scrollToMessage: engine.scrollToMessage,
		scrollToEnd: engine.scrollToEnd,
		scrollToStart: engine.scrollToStart,
	};
}

export function useMessageScrollerScrollable(): ScrollableEdges {
	const { report } = useMessageScrollerState();
	return { start: report.start, end: report.end };
}

export function useMessageScrollerVisibility(): MessageScrollerVisibility {
	const { report } = useMessageScrollerState();
	return { currentAnchorId: report.currentAnchorId, visibleMessageIds: report.visibleMessageIds };
}
