import { useCallback, useEffect, useState } from "react";

export interface Shown {
	readonly shown: number;
	readonly more: () => void;
}

export function useShown(source: string, size: number): Shown {
	const [shown, setShown] = useState(size);
	const more = useCallback(() => setShown((held) => held + size), [size]);
	useEffect(() => setShown(size), [source, size]);
	return { shown, more };
}
