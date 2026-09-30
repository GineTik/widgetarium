import { useCallback, useEffect, useState } from "react";

export interface Pages {
	readonly pages: number;
	readonly more: () => void;
}

export function usePages(source: string, size: number): Pages {
	const [pages, setPages] = useState(1);
	const more = useCallback(() => setPages((held) => held + 1), []);
	useEffect(() => setPages(1), [source, size]);
	return { pages, more };
}
