import { applyQuery, collectionGateway, toRows, valueGateway } from "./create";

const mintRef = () => `r${Math.random().toString(36).slice(2, 10)}`;

// CONTEXT: stored rows are { id, value }; a raw value is yesterday's shape, read by index
export function storedRows(stored) {
	return toRows(Array.isArray(stored) ? stored : [], "id");
}

// TRADE-OFF: an index ref becomes the stored id — minting one on a read is a write nobody asked for
function wrapRows(rows) {
	return rows.map((row) => ({ id: row.ref, value: row.value }));
}

const isPlain = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

// CONTEXT: update is a patch, never a replace — a rename must not drop the fields it did not name
function flattened(data) {
	if (!isPlain(data)) return data;
	const { props, ...rest } = data;
	return isPlain(props) ? { ...rest, ...props } : rest;
}

function patched(value, data) {
	if (!isPlain(value) || !isPlain(data)) return flattened(data);
	return { ...value, ...flattened(data) };
}

function updateStoredRow(write, { ref, data }) {
	let next = null;
	write((rows) =>
		rows.map((row) => {
			if (row.ref !== ref) return row;
			next = { ...row, value: patched(row.value, data) };
			return next;
		}),
	);
	return next;
}

function hardcodeWrites(write) {
	return {
		create: (draft) => {
			const row = { ref: mintRef(), value: flattened(draft) };
			write((rows) => [...rows, row]);
			return row;
		},
		update: (input) => updateStoredRow(write, input),
		remove: (ref) => {
			write((rows) => rows.filter((row) => row.ref !== ref));
		},
	};
}

// CONTEXT: every write is a mutator over the stored value as it stands — read-then-write races the tile
function hardcodeReads(rowsNow) {
	return {
		list: (query) => applyQuery(rowsNow(), query),
		get: (ref) => rowsNow().find((row) => row.ref === ref) ?? null,
	};
}

export function hardcodeCollection({ id, readValue, mutateValue, requested = [] }) {
	const rowsNow = () => storedRows(readValue());
	const write = (step) => mutateValue((stored) => wrapRows(step(storedRows(stored))));
	return collectionGateway({
		id,
		requested,
		settlesNow: true,
		handlers: { ...hardcodeReads(rowsNow), ...hardcodeWrites(write) },
	});
}

export function hardcodeValue({ id, readValue, mutateValue, requested = [] }) {
	return valueGateway({
		id,
		requested,
		settlesNow: true,
		handlers: {
			get: () => readValue() ?? null,
			update: (next) => {
				mutateValue(() => next);
				return next;
			},
		},
	});
}

// CONTEXT: `{ path }` is a vault binding, `{ value }` is hardcode — the config's shape says which
const BINDINGS = [
	["ref", (declared, held) => held.from === "ref" || typeof held.ref === "string"],
	["box", (declared) => Boolean(declared.of)],
	["hardcode", (declared, held) => held.from === "typed"],
	["vault", (declared, held) => held.from === "vault"],
	["hardcode", (declared, held) => held.value !== undefined],
	["vault", (declared, held) => Boolean(held.path)],
	["memory", (declared) => declared.default?.from === "memory"],
];

function bindingNamed(declared, held) {
	for (const [binding, isMatch] of BINDINGS) {
		if (isMatch(declared, held)) return binding;
	}
	return declared.default?.value !== undefined ? "hardcode" : "vault";
}

export function bindingOf(spec, config) {
	const declared = spec ?? {};
	const held = config ?? {};
	return { kind: declared.kind === "value" ? "value" : "collection", binding: bindingNamed(declared, held) };
}

export function requestedVerbs(spec) {
	const verbs = spec?.verbs;
	if (Array.isArray(verbs)) return verbs;
	return Object.keys(verbs ?? {});
}

export function requiredVerbs(spec) {
	const verbs = spec?.verbs;
	if (Array.isArray(verbs)) return verbs;
	return Object.entries(verbs ?? {})
		.filter(([, need]) => need === "required")
		.map(([verb]) => verb);
}

// CONTEXT: mount-time match — a widget whose required verb the gateway refuses is not drawable here
export function unmetVerbs(spec, gateway) {
	return requiredVerbs(spec).filter((verb) => {
		const held = gateway?.[verb];
		return typeof held !== "function" || held.can().can === false;
	});
}
