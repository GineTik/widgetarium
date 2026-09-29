import { useState } from "react";
import type { Preset } from "@default/lib";
import type { CardRow, TierRow } from "./types";

export function useOpened() {
	const [picked, pick] = useState("");
	const [isAdding, setAdding] = useState(false);
	const [editing, setEditing] = useState<CardRow | null>(null);
	const [naming, setNaming] = useState<TierRow | null>(null);
	const [isPicking, setPicking] = useState(false);
	const [preset, setPreset] = useState<Preset | null>(null);
	const [isResetting, setResetting] = useState(false);

	return {
		picked,
		pick,
		isAdding,
		editing,
		naming,
		isPicking,
		preset,
		isResetting,
		addCard: () => setAdding(true),
		editCard: setEditing,
		nameRow: setNaming,
		pickPreset: () => setPicking(true),
		wantPreset: setPreset,
		reset: () => setResetting(true),
		closeCard: () => {
			setAdding(false);
			setEditing(null);
		},
		closeRow: () => setNaming(null),
		closePresets: () => setPicking(false),
		closeWanted: () => setPreset(null),
		closeReset: () => setResetting(false),
	};
}
