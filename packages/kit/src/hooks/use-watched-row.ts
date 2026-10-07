import { useLayoutEffect } from "react";
import type { RefObject } from "react";
import type { ScrollEngine } from "../utils/message-scroll-engine";

export function useWatchedRow(engine: ScrollEngine, row: RefObject<HTMLElement | null>, messageId: string): void {
	useLayoutEffect(() => (row.current ? engine.watchRow(row.current) : undefined), [engine, messageId]);
}
