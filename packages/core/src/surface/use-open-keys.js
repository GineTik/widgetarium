import { useEffect, useState } from "react";

export function useOpenKeys(keys, cellFor) {
	const [open, setOpen] = useState(() => new Set());
	const joined = keys.join("\n");
	useEffect(() => {
		let isReading = true;
		const cells = keys.map((key) => [key, cellFor(key)]);
		const reread = () =>
			Promise.all(
				cells.map(([key, cell]) => Promise.resolve(cell.get()).then((value) => (value === true ? key : null))),
			).then((held) => {
				if (isReading) setOpen(new Set(held.filter(Boolean)));
			});
		reread();
		const stops = cells.map(([, cell]) => cell.subscribe(reread));
		return () => {
			isReading = false;
			for (const stop of stops) stop();
		};
	}, [joined, cellFor]);
	return open;
}
