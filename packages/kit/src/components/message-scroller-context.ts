import { createContext, useContext } from "react";
import type { Context } from "react";
import type { ScrollEngine, ScrollReport } from "../utils/message-scroll-engine";

export interface MessageScrollerState {
	readonly engine: ScrollEngine;
	readonly report: ScrollReport;
	readonly setPreserveOnPrepend: (isPreserved: boolean) => void;
}

export const MessageScrollerContext: Context<MessageScrollerState | null> = createContext<MessageScrollerState | null>(
	null,
);

export function useMessageScrollerState(): MessageScrollerState {
	const state = useContext(MessageScrollerContext);
	if (!state) throw new Error("a message scroller part stands outside MessageScrollerProvider");
	return state;
}

export function scrollableOf(report: ScrollReport): string | undefined {
	const edges = [report.start ? "start" : "", report.end ? "end" : ""].filter(Boolean).join(" ");
	return edges || undefined;
}
