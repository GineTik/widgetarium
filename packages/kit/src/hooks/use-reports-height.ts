import { useLayoutEffect } from "react";
import type { RefObject } from "react";
import type { ToastId } from "../utils/toast-queue";

export function useReportsHeight(
	itemRef: RefObject<HTMLElement | null>,
	id: ToastId,
	report: (id: ToastId, height: number) => void,
): void {
	useLayoutEffect(() => {
		const item = itemRef.current;
		if (item) report(id, item.offsetHeight);
	});
}
