import { useMemo } from "react";
import { stableKey } from "../gateway/cache.js";
import { arrayGateway, valueGateway } from "../gateway/create.js";
import { useDropsOnUnmount } from "./use-drops-on-unmount.js";

export function usePublishesSwap(swap, { refs, cell, named, rows }) {
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

function holdsCollection(ref, rows) {
	const held = rows.map((row) => ({
		ref: row.name,
		value: { name: row.name, value: row.name, hidden: Boolean(row.hidden) },
	}));
	return arrayGateway(() => held, {}, `${ref}?${stableKey(held)}`);
}

// TRADE-OFF: each box publishes a wrapper of its own over the shared cell, because a drop is matched by identity and a box leaving after its replacement arrived would otherwise take the replacement's selection with it
function createOwnedSelection(cell) {
	return valueGateway({
		id: cell.id,
		handlers: {
			get: () => cell.get(),
			update: (next) => cell.update(next),
			remove: () => cell.remove(),
		},
		subscribe: (listener) => cell.subscribe(listener),
	});
}

function describeSwap(swap, prop, kind) {
	return { tile: swap.id, prop, label: prop === "holds" ? "Views" : "Shown view", title: "View box", kind };
}
