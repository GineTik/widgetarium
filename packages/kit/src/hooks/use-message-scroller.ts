import { useMessageScrollerState } from "../components/message-scroller-context";
import type { ScrollJump } from "../utils/message-scroll-engine";

export interface MessageScrollerCommands {
	readonly scrollToMessage: (id: string, jump?: ScrollJump) => boolean;
	readonly scrollToEnd: (jump?: ScrollJump) => boolean;
	readonly scrollToStart: (jump?: ScrollJump) => boolean;
}

export function useMessageScroller(): MessageScrollerCommands {
	const { engine } = useMessageScrollerState();
	return {
		scrollToMessage: engine.scrollToMessage,
		scrollToEnd: engine.scrollToEnd,
		scrollToStart: engine.scrollToStart,
	};
}
