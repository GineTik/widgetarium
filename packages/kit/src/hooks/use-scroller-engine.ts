import { useMemo, useRef, useState } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import type { MessageScrollerState } from "../components/message-scroller-context";
import { createScrollEngine, OPENING_REPORT } from "../utils/message-scroll-engine";
import type { ScrollEngine, ScrollReport, ScrollSettings } from "../utils/message-scroll-engine";

export type ProviderSettings = Omit<ScrollSettings, "preserveScrollOnPrepend">;

interface EngineOwner {
	readonly settings: RefObject<ProviderSettings>;
	readonly preserve: RefObject<boolean>;
	readonly setReport: Dispatch<SetStateAction<ScrollReport>>;
}

export function useScrollerEngine(said: ProviderSettings): MessageScrollerState {
	const settings = useRef(said);
	settings.current = said;
	const preserve = useRef(true);
	const [report, setReport] = useState<ScrollReport>(OPENING_REPORT);
	const [engine] = useState(() => createOwnedEngine({ settings, preserve, setReport }));
	return useMemo(
		() => ({ engine, report, setPreserveOnPrepend: (isPreserved: boolean) => (preserve.current = isPreserved) }),
		[engine, report],
	);
}

function createOwnedEngine({ settings, preserve, setReport }: EngineOwner): ScrollEngine {
	return createScrollEngine(
		() => ({ ...settings.current, preserveScrollOnPrepend: preserve.current }),
		reportKeeperOf(setReport),
	);
}

function reportKeeperOf(setReport: Dispatch<SetStateAction<ScrollReport>>): (next: ScrollReport) => void {
	return (next) => setReport((was) => (isSameReport(was, next) ? was : next));
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
