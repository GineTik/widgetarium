import { useEffect, useState } from "react";

export function useShown(size: number, source: string) {
	const [shown, setShown] = useState(size);
	useEffect(() => setShown(size), [size, source]);
	return { shown, more: () => setShown(shown + size) };
}
