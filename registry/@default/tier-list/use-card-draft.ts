import { useEffect, useState } from "react";
import { nameOf } from "./cards";
import type { CardRow, Draft } from "./types";

export function useCardDraft(isOpen: boolean, row: CardRow | null) {
	const [draft, setDraft] = useState<Draft>({ name: "", picture: "" });

	useEffect(() => {
		if (!isOpen) return;
		setDraft({ name: row ? nameOf(row) : "", picture: row ? String(row.picture ?? "") : "" });
	}, [isOpen, row?.ref]);

	return [draft, setDraft] as const;
}
