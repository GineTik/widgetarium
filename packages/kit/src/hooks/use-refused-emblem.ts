import { useLayoutEffect } from "react";
import type { EmblemStatus } from "../constants/emblem";
import { warnOnce } from "../utils/surface";

export function useRefusedEmblem(refusal: string | undefined, setStatus: (status: EmblemStatus) => void): void {
	useLayoutEffect(() => {
		if (!refusal) return;
		setStatus("refused");
		warnOnce(`a DiceBear emblem drew nothing — ${refusal}`);
	}, [refusal]);
}
