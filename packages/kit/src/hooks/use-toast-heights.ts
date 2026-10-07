import { useCallback, useState } from "react";
import type { ToastId } from "../utils/toast-queue";

export interface ToastHeights {
	readonly heights: ReadonlyMap<ToastId, number>;
	readonly report: (id: ToastId, height: number) => void;
}

export function useToastHeights(): ToastHeights {
	const [heights, setHeights] = useState<ReadonlyMap<ToastId, number>>(new Map());
	const report = useCallback((id: ToastId, height: number) => {
		setHeights((held) => (held.get(id) === height ? held : new Map(held).set(id, height)));
	}, []);
	return { heights, report };
}
