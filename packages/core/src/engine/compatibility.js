const SAME_SHAPE_KEYS = ["kind", "control", "of", "picks", "field", "fieldFrom", "shape"];

const shapeOf = (spec) => JSON.stringify(SAME_SHAPE_KEYS.map((key) => spec?.[key] ?? null));

const namesOf = (spec, name) => [name, ...(spec?.aka ?? [])];

function renamedTo(props, name) {
	return (
		Object.entries(props ?? {}).find(([now, spec]) => now !== name && namesOf(spec, now).includes(name))?.[0] ?? null
	);
}

const sameDefault = (from, to) => JSON.stringify(from?.default ?? null) === JSON.stringify(to?.default ?? null);

function missingChangeOf(name, from, props) {
	const renamed = renamedTo(props, name);
	if (!renamed) return { prop: name, kind: "removed", breaks: true };
	if (shapeOf(from) !== shapeOf(props[renamed])) return { prop: name, kind: "reshaped", breaks: true };
	return { prop: name, kind: "renamed", to: renamed, breaks: false };
}

function changeOf(name, from, props) {
	const to = props[name];
	if (!to) return missingChangeOf(name, from, props);
	if (shapeOf(from) !== shapeOf(to)) return { prop: name, kind: "reshaped", breaks: true };
	if (!sameDefault(from, to)) return { prop: name, kind: "default", breaks: true, implicit: true };
	const added = (to.writes ?? []).filter((verb) => !(from.writes ?? []).includes(verb));
	return added.length > 0 ? { prop: name, kind: "writes", breaks: false, verbs: added } : null;
}

function addedProps(fromProps, toProps) {
	return Object.entries(toProps)
		.filter(([name, spec]) => !fromProps[name] && !(spec.aka ?? []).some((old) => fromProps[old]))
		.map(([name, spec]) => ({
			prop: name,
			kind: "added",
			breaks: !spec.default && spec.control !== "pick" && spec.control !== "row",
		}));
}

export function propChanges(fromProps = {}, toProps = {}) {
	const changed = Object.entries(fromProps)
		.map(([name, spec]) => changeOf(name, spec, toProps))
		.filter(Boolean);
	return [...changed, ...addedProps(fromProps, toProps)];
}

const sameProps = (from, props) =>
	Object.keys(from ?? {}).length === Object.keys(props ?? {}).length &&
	Object.entries(from ?? {}).every(([name, spec]) => props?.[name] && shapeOf(spec) === shapeOf(props[name]));

export function migrationFrom(manifest, fromProps) {
	return (manifest?.migrate ?? []).find((step) => sameProps(step.from, fromProps)) ?? null;
}

const tilesCanMove = (breaking, migration) => migration !== null || breaking.every((change) => change.implicit);

export function compatibility(from, to) {
	const fromProps = from?.props ?? {};
	const changes = propChanges(fromProps, to?.props ?? {});
	const breaking = changes.filter((change) => change.breaks);
	const migration = migrationFrom(to, fromProps);
	return {
		isCompatible: breaking.length === 0,
		changes,
		breaking,
		canMoveTiles: tilesCanMove(breaking, migration),
		migration,
	};
}

function renamedConfig(props, changes) {
	const moved = { ...props };
	for (const change of changes.filter((held) => held.kind === "renamed")) {
		if (moved[change.prop] === undefined) continue;
		moved[change.to] = moved[change.prop];
		delete moved[change.prop];
	}
	return moved;
}

export function movedTileProps(props, verdict) {
	const renamed = renamedConfig(props ?? {}, verdict.changes);
	if (!verdict.migration) return renamed;
	return { ...renamed, ...verdict.migration.run(renamed) };
}
