import { useSyncExternalStore } from "react";
import { TOAST_QUEUE } from "../utils/toast-queue";
import type { ToastRecord } from "../utils/toast-queue";

export function useToasts(): readonly ToastRecord[] {
	return useSyncExternalStore(TOAST_QUEUE.subscribe, TOAST_QUEUE.read);
}
