import type { Gates, RackView } from "./types";
import { useCardWriting } from "./use-card-writing";
import { useRowWriting } from "./use-row-writing";
import { useSeeding } from "./use-seeding";

export function useWriting(held: RackView, gates: Gates) {
	const cardWriting = useCardWriting(held, gates);
	return { ...cardWriting, ...useRowWriting(held, gates, cardWriting.listOf), ...useSeeding(gates) };
}
