import { useEffect, useState } from "react";
import type { GatewayRefs } from "../gateway/refs.js";

export type BoxValues = Readonly<Record<string, unknown>>;

export function useBoxValues(refs: GatewayRefs | null | undefined, isOpen: boolean): BoxValues {
	const [held, setHeld] = useState<BoxValues>({});
	const wanted = isOpen ? valueRefsOf(refs).join("|") : "";
	useEffect(() => {
		if (!wanted || !refs) return undefined;
		let alive = true;
		const asked = wanted.split("|");
		const reread = (): Promise<void> =>
			Promise.all(asked.map((ref) => Promise.resolve(refs.read(ref)).catch(() => null))).then((found) => {
				if (alive) setHeld(Object.fromEntries(asked.map((ref, at) => [ref, found[at]])));
			});
		reread();
		const stop = refs.watch(asked, reread);
		return () => {
			alive = false;
			stop?.();
		};
	}, [wanted, refs]);
	return held;
}

function valueRefsOf(refs: GatewayRefs | null | undefined): string[] {
	return (refs?.offered?.() ?? []).filter((entry) => entry.kind === "value").map((entry) => entry.ref ?? "");
}
