import { useEffect, useState } from "react";
import type { ViewCell } from "../gateway/refs.js";

export function useOpenKeys(keys: readonly string[], cellFor: (key: string) => ViewCell): ReadonlySet<string> {
	const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
	const joined = keys.join("\n");
	useEffect(() => {
		let isReading = true;
		const cells = keys.map((key) => [key, cellFor(key)] as const);
		const reread = () =>
			openKeysOf(cells).then((held) => {
				if (isReading) setOpen(held);
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

async function openKeysOf(cells: readonly (readonly [string, ViewCell])[]): Promise<ReadonlySet<string>> {
	const held = await Promise.all(cells.map(async ([key, cell]) => ((await cell.get()) === true ? key : null)));
	return new Set(held.filter((key): key is string => Boolean(key)));
}
