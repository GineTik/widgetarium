import { useMessageScrollerState } from "../components/message-scroller-context";

export interface MessageScrollerVisibility {
	readonly currentAnchorId: string | null;
	readonly visibleMessageIds: readonly string[];
}

export function useMessageScrollerVisibility(): MessageScrollerVisibility {
	const { report } = useMessageScrollerState();
	return { currentAnchorId: report.currentAnchorId, visibleMessageIds: report.visibleMessageIds };
}
