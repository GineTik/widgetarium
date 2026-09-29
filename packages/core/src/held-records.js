import { readSlotSurface } from "./surface-roles.js";

// TRADE-OFF: the live widget wins over the record's, which is a mirror of it
export function heldTile(holder, hold, key, widget) {
	const held = holder[hold]?.[key] ?? {};
	return {
		id: `${holder.id}/${key}`,
		widget,
		settings: held.settings ?? {},
		mounts: held.mounts ?? {},
		props: held.props ?? {},
		slots: held.slots ?? {},
		mounted: held.mounted ?? {},
		...heldLook(held),
	};
}

export function heldLook(held) {
	const surface = readSlotSurface(held.surface);
	return surface ? { surface } : {};
}

export function mountKeys(ids) {
	const taken = new Map();
	return ids.map((id) => {
		const nth = (taken.get(id) ?? 0) + 1;
		taken.set(id, nth);
		return nth === 1 ? id : `${id}#${nth}`;
	});
}

export function uniqueName(taken, wanted) {
	const base = String(wanted ?? "").trim();
	let name = base;
	let nth = 1;
	while (taken.has(name)) {
		nth += 1;
		name = `${base} ${nth}`;
	}
	taken.add(name);
	return name;
}

export function heldKey(held, key, was) {
	return !held?.[key] && was && held?.[was] ? was : key;
}

export function propConfig(tile, key, spec) {
	return tile?.props?.[propKeyHeld(tile?.props, key, spec?.aka)] ?? {};
}

export function rekey(held, key, was, patch) {
	const { [was]: legacy, ...rest } = held ?? {};
	return { ...rest, [key]: { ...(held?.[key] ?? legacy ?? {}), ...patch } };
}

export function mountList(tile, name, spec) {
	return (
		underEitherKey(tile?.mounts, name, spec?.was) ?? underEitherKey(tile?.settings, name, spec?.was) ?? spec?.default
	);
}

export function mountRows(value, nameFor) {
	const rows = rowsFromListOrCommaText(value);
	const widgetIdKeys = mountKeys(rows.map((row) => row.widget));
	const taken = new Set();
	return rows.map((row, index) => ({
		name: uniqueName(taken, row.name || nameFor?.(row.widget) || row.widget),
		widget: row.widget,
		hidden: row.hidden,
		was: widgetIdKeys[index],
	}));
}

export function mountRowToStore(row) {
	return { name: row.name, widget: row.widget ?? "", ...(row.hidden ? { hidden: true } : {}) };
}

export function keysStillNamed(rows) {
	const kept = new Set();
	for (const row of rows) {
		kept.add(row.name);
		if (row.was) kept.add(row.was);
	}
	return kept;
}

export function keepNamedRecords(mounted, rows) {
	const kept = keysStillNamed(rows);
	return Object.fromEntries(Object.entries(mounted ?? {}).filter(([key]) => kept.has(key)));
}

export function mountPatch(tile, name, rows, was) {
	const kept = new Set(rows.map((row) => row.name));
	const moved = Object.entries(afterRenames(tile.mounted, rows));
	return {
		mounts: { ...withoutKey(tile.mounts, was), [name]: rows.map(mountRowToStore) },
		settings: withoutKey(withoutKey(tile.settings, was), name),
		mounted: Object.fromEntries(moved.filter(([key]) => kept.has(key))),
	};
}

export function withoutKey(held, key) {
	const { [key]: dropped, ...rest } = held ?? {};
	return rest;
}

function rowsFromListOrCommaText(value) {
	const list = Array.isArray(value) ? value : String(value ?? "").split(",");
	return list
		.map((entry) =>
			typeof entry === "string"
				? { name: "", widget: entry, hidden: false }
				: { name: String(entry?.name ?? ""), widget: String(entry?.widget ?? ""), hidden: entry?.hidden === true },
		)
		.map((row) => ({ name: row.name.trim(), widget: row.widget.trim(), hidden: row.hidden }))
		.filter(isWidgetOrViewAwaitingOne);
}

function isWidgetOrViewAwaitingOne(row) {
	return row.widget !== "" || row.name !== "";
}

function propKeyHeld(props, key, was) {
	if (props?.[key]) return key;
	return [].concat(was ?? []).find((old) => props?.[old]) ?? key;
}

function underEitherKey(held, name, was) {
	return held?.[name] ?? (was ? held?.[was] : undefined);
}

function afterRenames(mounted, rows) {
	let held = mounted ?? {};
	for (const row of rows) {
		if (!row.was || row.was === row.name || !held[row.was]) continue;
		held = rekey(held, row.name, row.was, {});
	}
	return held;
}
