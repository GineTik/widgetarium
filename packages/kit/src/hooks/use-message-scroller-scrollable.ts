import { useMessageScrollerState } from "../components/message-scroller-context";
import type { ScrollableEdges } from "../utils/message-scroll-geometry";

export function useMessageScrollerScrollable(): ScrollableEdges {
	const { report } = useMessageScrollerState();
	return { start: report.start, end: report.end };
}
