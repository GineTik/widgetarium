import { useCallback, useEffect, useState } from "react";

export function usePages(source: string, size: number) {
	const [pages, setPages] = useState(1);
	const more = useCallback(() => setPages((held) => held + 1), []);
	useEffect(() => setPages(1), [source, size]);
	return { pages, more };
}
