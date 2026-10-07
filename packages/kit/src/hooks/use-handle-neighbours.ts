import { useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { neighboursOf } from "./use-handle-drag";
import type { HandleNeighbours } from "./use-handle-drag";

export interface HandleNeighbourWatch {
	readonly handleRef: RefObject<HTMLDivElement | null>;
	readonly neighbours: HandleNeighbours | null;
}

export function useHandleNeighbours(): HandleNeighbourWatch {
	const handleRef = useRef<HTMLDivElement | null>(null);
	const [neighbours, setNeighbours] = useState<HandleNeighbours | null>(null);
	useLayoutEffect(() => setNeighbours(handleRef.current ? neighboursOf(handleRef.current) : null), []);
	return { handleRef, neighbours };
}
