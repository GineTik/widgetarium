import { useEffect, useState } from "react";
import { labelOf } from "./tiers";
import { toneOf } from "./tones";
import type { TierRow } from "./types";

export function useRowDraft(row: TierRow | null) {
	const [label, setLabel] = useState("");
	const [tone, setTone] = useState("neutral");

	useEffect(() => {
		if (!row) return;
		setLabel(labelOf(row));
		setTone(toneOf(row));
	}, [row?.ref]);

	return { label, setLabel, tone, setTone };
}
