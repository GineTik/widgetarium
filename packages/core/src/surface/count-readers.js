export function countReaders(registry, tiles, folderPath) {
	if (!folderPath) return 0;
	let found = 0;
	const walk = (widget, props) => {
		const declared = registry.get(widget)?.manifest?.props ?? {};
		for (const name of Object.keys(declared)) {
			if ((props?.[name]?.path || "") === folderPath) found += 1;
		}
	};
	const descend = (held) => {
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
