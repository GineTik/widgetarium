import { useEffect, useState } from "react";

export function useDraftFollowing(value: unknown) {
	const [draft, setDraft] = useState(String(value ?? ""));

	useEffect(() => {
		setDraft(String(value ?? ""));
	}, [value]);

	return [draft, setDraft] as const;
}
