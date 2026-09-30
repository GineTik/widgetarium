import { useMemo } from "react";
import { stableKey } from "../gateway/cache.js";
import { arrayGateway, valueGateway } from "../gateway/create.js";
import type { CollectionGateway, ValueGateway } from "../gateway/contract.js";
import type { EveryValueVerb } from "../gateway/needs.js";
import type { GatewayRefs, RefDescription, ViewCell } from "../gateway/refs.js";
import type { TabRow } from "../tab-rows.js";
import type { LaidBox } from "../tree-laid.js";
import { useDropsOnUnmount } from "./use-drops-on-unmount.js";

export interface SwapRefs {
	readonly holds: string | null;
	readonly selection: string;
}

interface SwapPublishing {
	readonly refs: GatewayRefs;
	readonly cell: ViewCell;
	readonly named: SwapRefs;
	readonly rows: readonly TabRow[];
}

interface HeldView {
	readonly name: string;
	readonly value: string;
	readonly hidden: boolean;
}

type SwapProp = "holds" | "selection";

export function usePublishesSwap(swap: Pick<LaidBox, "id">, { refs, cell, named, rows }: SwapPublishing): void {
	const holds = useMemo(() => holdsCollection(named.holds ?? named.selection, rows), [named.holds, stableKey(rows)]);
	const selection = useMemo(() => createOwnedSelection(cell), [cell]);
	if (named.holds) {
		refs.put(named.holds, holds, { describes: describeSwap(swap, "holds", "collection") });
		refs.put(named.selection, selection, { describes: describeSwap(swap, "selection", "value") });
	}
	useDropsOnUnmount(
		refs,
		named.holds
			? [
					[named.holds, holds],
					[named.selection, selection],
				]
			: [],
	);
}

function holdsCollection(ref: string, rows: readonly TabRow[]): CollectionGateway<HeldView> {
	const held = rows.map((row) => ({
		ref: row.name,
		value: { name: row.name, value: row.name, hidden: Boolean(row.hidden) },
	}));
	return arrayGateway<HeldView>(() => held, {}, `${ref}?${stableKey(held)}`);
}

// TRADE-OFF: each box publishes a wrapper of its own over the shared cell, because a drop is matched by identity and a box leaving after its replacement arrived would otherwise take the replacement's selection with it
function createOwnedSelection(cell: ViewCell): ValueGateway<unknown, EveryValueVerb> {
	return valueGateway<unknown>({
		id: cell.id,
		handlers: {
			get: () => cell.get(),
			update: (next: unknown) => cell.update(next),
			remove: () => cell.remove(),
		},
		subscribe: (listener) => cell.subscribe(listener),
	});
}

function describeSwap(swap: Pick<LaidBox, "id">, prop: SwapProp, kind: string): RefDescription {
	return { tile: swap.id ?? "", prop, label: prop === "holds" ? "Views" : "Shown view", title: "View box", kind };
}
