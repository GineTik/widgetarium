import { useEffect, useState } from "react";

export interface ViewportSize {
	readonly width: number;
	readonly height: number;
}

export function useViewport(): ViewportSize {
	const [box, setBox] = useState(viewportNow);
	useEffect(() => {
		const measure = () =>
			setBox((held) => {
				const now = viewportNow();
				return isSameSize(held, now) ? held : now;
			});
		globalThis.window?.addEventListener("resize", measure);
		return () => globalThis.window?.removeEventListener("resize", measure);
	}, []);
	return box;
}

function viewportNow(): ViewportSize {
	return { width: globalThis.window?.innerWidth ?? 0, height: globalThis.window?.innerHeight ?? 0 };
}

function isSameSize(one: ViewportSize, other: ViewportSize): boolean {
	return one.width === other.width && one.height === other.height;
}
