import { useEffect, useState } from "react";
import type { ViewCell } from "../gateway/refs.js";

export function useCellValue(cell: ViewCell): unknown {
	const [held, setHeld] = useState<unknown>(null);
	useEffect(() => {
		let isReading = true;
		const reread = (): Promise<void> =>
			Promise.resolve(cell.get()).then((value) => {
				if (isReading) setHeld(value ?? null);
			});
		reread();
		const stop = cell.subscribe(reread);
		return () => {
			isReading = false;
			stop();
		};
	}, [cell]);
	return held;
}
