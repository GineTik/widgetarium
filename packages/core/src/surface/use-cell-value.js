import { useEffect, useState } from "react";

export function useCellValue(cell) {
	const [held, setHeld] = useState(null);
	useEffect(() => {
		let isReading = true;
		const reread = () =>
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
