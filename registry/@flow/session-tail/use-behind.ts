import { useEffect, useState } from "react";

export function useBehind(isFollowing: boolean, total: number | null) {
	const [marked, setMarked] = useState<number | null>(null);

	useEffect(() => setMarked(isFollowing ? null : total), [isFollowing]);

	if (isFollowing || marked === null || total === null) return 0;
	return Math.max(0, total - marked);
}
