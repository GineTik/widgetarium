import { useLayoutEffect } from "react";
import type { EmblemStatus } from "../constants/emblem";

export function useImageProbe(src: string | undefined, setStatus: (status: EmblemStatus) => void): void {
	useLayoutEffect(() => {
		if (!src) return setStatus("failed");
		setStatus("loading");
		const probe = new Image();
		probe.onload = () => setStatus("loaded");
		probe.onerror = () => setStatus("failed");
		probe.src = src;
		return () => {
			probe.onload = null;
			probe.onerror = null;
		};
	}, [src]);
}
