import type { HeldRecord, Tile, TileProps } from "../model.js";
import type { SurfaceRegistry } from "./use-surface-shared.js";

type MountedRecords = Readonly<Record<string, HeldRecord>> | null | undefined;

export function countReaders(
	registry: SurfaceRegistry,
	tiles: readonly Tile[],
	folderPath: string | null | undefined,
): number {
	if (!folderPath) return 0;
	let found = 0;
	const walk = (widget: string, props: TileProps | null | undefined): void => {
		const declared = registry.get(widget)?.manifest?.props ?? {};
		for (const name of Object.keys(declared)) {
			if ((props?.[name]?.path || "") === folderPath) found += 1;
		}
	};
	const descend = (held: MountedRecords): void => {
		for (const entry of Object.values(held ?? {})) {
			walk(entry.widget, entry.props);
			descend(entry.mounted);
		}
	};
	for (const tile of tiles) {
		walk(tile.widget, tile.props);
		descend(tile.mounted);
	}
	return found;
}
