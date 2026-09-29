import { useMemo } from "react";
import type { CollectionGateway } from "./contract";
import { stableKey } from "./cache";
import type { Narrowing } from "./narrow";
import { narrow } from "./narrow";

export function useNarrowed<T>(base: CollectionGateway<T>, where: Narrowing, by?: string): CollectionGateway<T> {
	const key = stableKey(where);
	return useMemo(() => narrow(base, where, by), [base.id, key, by]);
}
