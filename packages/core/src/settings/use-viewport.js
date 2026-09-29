import { useEffect, useState } from "react";

export function useViewport() {
	const read = () => ({ width: globalThis.window?.innerWidth ?? 0, height: globalThis.window?.innerHeight ?? 0 });
	const [box, setBox] = useState(read);
	useEffect(() => {
		const measure = () =>
			setBox((held) => {
				const now = read();
				return held.width === now.width && held.height === now.height ? held : now;
			});
		globalThis.window?.addEventListener("resize", measure);
		return () => globalThis.window?.removeEventListener("resize", measure);
	}, []);
	return box;
}
