import { useCallback, useEffect, useState } from "react";

export function useShown(source: string, size: number) {
	const [shown, setShown] = useState(size);
	const more = useCallback(() => setShown((held) => held + size), [size]);
	useEffect(() => setShown(size), [source, size]);
	return { shown, more };
}
