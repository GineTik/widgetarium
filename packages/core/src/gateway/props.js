import {
	applyQuery,
	arrayGateway,
	collectionGateway,
	refusedVerb,
	rowOf,
	soloGateway,
	toRows,
	valueGateway,
	valueIn,
} from "./create";
import { stableKey } from "./cache";
import { FIELD_TYPES } from "./fields";

export function slotDefaults(manifest, held) {
	return Object.fromEntries(
		Object.entries(manifest?.props ?? {}).map(([name, spec]) => [
			name,
			declaredGateway(`${manifest.id}/${name}`, spec, held?.props?.[name]),
		]),
	);
}

const mintRef = () => `r${Math.random().toString(36).slice(2, 10)}`;

const labelFromKey = (name) => {
	const spaced = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]+/g, " ");
	return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
};

export function describedFields(spec) {
	return Object.entries(spec?.describes ?? {}).map(([key, held]) => ({
		key,
		label: held.label ?? labelFromKey(key),
		type: held.type ?? "text",
		required: held.required === true,
	}));
}

export function needsOf(spec) {
	const mapped = Object.entries(spec?.describes ?? {}).filter(([, held]) => Array.isArray(held.aka));
	return Object.fromEntries(
		mapped.map(([field, held]) => [field, { ...held, type: FIELD_TYPES.includes(held.type) ? held.type : "text" }]),
	);
}

export function declaredOf(spec) {
	return spec?.kind === "collection" ? spec.default?.rows : spec?.default?.value;
}

export function typedKeyOf(spec) {
	return spec?.kind === "collection" ? "rows" : "value";
}

export function typedIn(spec, config) {
	return config?.[typedKeyOf(spec)];
}

export function withTyped(spec, config, held) {
	return { ...config, [typedKeyOf(spec)]: held };
}

function configRows(stored) {
	return Array.isArray(stored) ? stored : [];
}

export function storedRows(stored, spec) {
	return toRows(configRows(stored), "id");
}

// TRADE-OFF: an index ref becomes the stored id — minting one on a read is a write nobody asked for
function wrapRows(rows) {
	return rows.map((row) => ({ id: row.ref, value: valueIn(row) }));
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
			next = rowOf(patched(valueIn(row), data), ref);
			return next;
		}),
	);
	return next;
}

const withMintedRef = (row) => (row?.ref ? row : { ...row, ref: mintRef() });

function hardcodeWrites(write) {
	return {
		create: (draft) => {
			const row = rowOf(flattened(draft), mintRef());
			write((rows) => [...rows, row]);
			return row;
		},
		update: (input) => updateStoredRow(write, input),
		remove: (ref) => {
			write((rows) => rows.filter((row) => row.ref !== ref));
		},
		replace: (rows) => {
			write(() => (rows ?? []).map(withMintedRef));
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

export function hardcodeCollection({ id, readValue, mutateValue, requested = [], spec }) {
	const rowsNow = () => storedRows(readValue(), spec);
	const write = (step) => mutateValue((stored) => wrapRows(step(storedRows(stored, spec))));
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
	["stat", (declared, held) => declared.kind === "value" && held.from === "stat"],
	["ref", (declared, held) => held.from === "ref" || typeof held.ref === "string"],
	["box", (declared) => Boolean(declared.of)],
	["hardcode", (declared, held) => held.from === "typed"],
	["vault", (declared, held) => held.from === "vault"],
	["hardcode", (declared, held) => typedIn(declared, held) !== undefined],
	["vault", (declared, held) => Boolean(held.path)],
	["memory", (declared) => declared.default?.from === "memory"],
];

function bindingNamed(declared, held) {
	for (const [binding, isMatch] of BINDINGS) {
		if (isMatch(declared, held)) return binding;
	}
	return declared.default?.value !== undefined || declared.default?.rows !== undefined ? "hardcode" : "vault";
}

export function bindingOf(spec, config) {
	const declared = spec ?? {};
	const held = config ?? {};
	return { kind: declared.kind === "value" ? "value" : "collection", binding: bindingNamed(declared, held) };
}

const VERBS_A_VAULT_BINDING_OFFERS_UNASKED = ["list", "get"];
const NOT_SWITCHED_ON = "{verb} is not switched on for this tile";

const ALLOW_IS_NOT_A_LIST =
	"[widgetarium] a tile's allow is not a list of verbs, so only what its binding offers unasked is switched on:";

function allowWritten(config, unasked) {
	if (config?.allow === undefined) return unasked;
	if (Array.isArray(config.allow)) return config.allow;
	console.error(ALLOW_IS_NOT_A_LIST, config.allow);
	return unasked;
}

export function allowedVerbs(spec, config, binding) {
	const uses = spec?.writes ?? [];
	const allowed = allowWritten(config, binding === "vault" ? VERBS_A_VAULT_BINDING_OFFERS_UNASKED : uses);
	return uses.map((verb) =>
		allowed.includes(verb)
			? { verb, can: true, reason: null }
			: { verb, can: false, reason: NOT_SWITCHED_ON.replace("{verb}", verb) },
	);
}

export function withinAllowed(gateway, decisions) {
	const refused = decisions.filter((decision) => !decision.can);
	if (!gateway || refused.length === 0) return gateway;
	const narrowed = { ...gateway };
	for (const decision of refused) narrowed[decision.verb] = refusedVerb(gateway[decision.verb], decision.reason);
	return narrowed;
}

export function requestedVerbs(spec) {
	return spec?.writes ?? [];
}

function declaredGateway(key, spec, config) {
	if (spec.kind === "collection") {
		const rows = storedRows(config?.rows ?? spec.default?.rows, spec);
		return arrayGateway(rows, {}, `slot:${key}?${stableKey(rows)}`);
	}
	const value = config?.value ?? spec.default?.value ?? null;
	return soloGateway(value, {}, `slot:${key}?${stableKey(value)}`);
}
