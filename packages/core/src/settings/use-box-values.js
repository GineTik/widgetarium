import { useEffect, useState } from "react";

export function useBoxValues(refs, isOpen) {
	const [held, setHeld] = useState({});
	const wanted = isOpen ? valueRefsOf(refs).join("|") : "";
	useEffect(() => {
		if (!wanted) return undefined;
		let alive = true;
		const asked = wanted.split("|");
		const reread = () =>
			Promise.all(asked.map((ref) => Promise.resolve(refs.read(ref)).catch(() => null))).then(
				(found) => alive && setHeld(Object.fromEntries(asked.map((ref, at) => [ref, found[at]]))),
			);
		reread();
		const stop = refs.watch(asked, reread);
		return () => {
			alive = false;
			stop?.();
		};
	}, [wanted, refs]);
	return held;
}

function valueRefsOf(refs) {
	return (refs?.offered?.() ?? []).filter((entry) => entry.kind === "value").map((entry) => entry.ref);
}
