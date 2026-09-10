// TRADE-OFF: a widget id in a manifest, the way a slot already names its default widget — a bare prop name would collide, since two widgets both offer `selection`

const mountedTiles = (tile) => Object.entries(tile.mounted ?? {}).map(([name, held]) => ({ ...held, id: name }));

export function tilesByWidget(tiles, currentId = (id) => id) {
	const seen = new Map();
	const walk = (held, at) => {
		for (const tile of held ?? []) {
			const id = at ? `${at}/${tile.id}` : tile.id;
			const widget = tile.widget && currentId(tile.widget);
			if (widget && !seen.has(widget)) seen.set(widget, id);
			walk(mountedTiles(tile), id);
		}
	};
	walk(tiles, null);
	return seen;
}

function refFor(wants, standing) {
	const at = String(wants ?? "").lastIndexOf("/");
	if (at < 0) return null;
	const held = standing.get(String(wants).slice(0, at));
	return held ? `${held}/${String(wants).slice(at + 1)}` : null;
}

export function isUnresolved(held) {
	return Boolean(held) && typeof held === "object" && typeof held.wants === "string" && typeof held.ref !== "string";
}

function wantedIn(row) {
	if (typeof row?.spread?.wants === "string") return row.spread.wants;
	if (typeof row?.value?.wants === "string") return row.value.wants;
	return null;
}

function wiredRow(row, standing) {
	const ref = refFor(wantedIn(row), standing);
	if (!ref) return null;
	return row.spread ? { ...row, spread: { ref }, fixed: true } : { ...row, value: { ref }, fixed: true };
}

function wiredWhere(spec, config, standing) {
	const rows = (spec.default?.where ?? []).map((row) => wiredRow(row, standing)).filter(Boolean);
	const own = (config.where ?? []).filter((row) => row.fixed !== true);
	if (rows.length === 0) return null;
	return [...rows, ...own];
}

function wiredProp(spec, config, standing) {
	if (typeof spec.wants === "string") {
		if (typeof config.ref === "string") return null;
		const ref = refFor(spec.wants, standing);
		return ref ? { ...config, from: "ref", ref } : null;
	}
	const where = wiredWhere(spec, config, standing);
	if (!where) return null;
	return stableWhere(where) === stableWhere(config.where) ? null : { ...config, where };
}

const stableWhere = (rows) => JSON.stringify(rows ?? []);

function wiredProps(tile, manifest, standing) {
	const held = tile.props ?? {};
	const wired = Object.entries(manifest?.props ?? {})
		.map(([name, spec]) => [name, wiredProp(spec, held[name] ?? {}, standing)])
		.filter(([, config]) => config);
	return wired.length === 0 ? null : { ...held, ...Object.fromEntries(wired) };
}

function wiredHeld(held, registry, standing) {
	const props = wiredProps(held, registry.get(held.widget)?.manifest, standing);
	const mounted = wiredMounted(held.mounted, registry, standing);
	if (!props && !mounted) return held;
	return { ...held, ...(props ? { props } : {}), ...(mounted ? { mounted } : {}) };
}

function wiredMounted(mounted, registry, standing) {
	const entries = Object.entries(mounted ?? {});
	if (entries.length === 0) return null;
	const wired = entries.map(([name, held]) => [name, wiredHeld(held, registry, standing)]);
	return wired.some(([name, held]) => held !== mounted[name]) ? Object.fromEntries(wired) : null;
}

export function wiredTiles(tiles, registry) {
	const standing = tilesByWidget(tiles, (id) => registry.resolveId?.(id) ?? id);
	return tiles.map((tile) => wiredHeld(tile, registry, standing));
}
