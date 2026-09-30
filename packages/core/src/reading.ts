export const SEQUENCE = "sequence";
export const COMPARISON = "comparison";
export const TABLE = "table";
export const CROSS = "cross";
export const FIELD = "field";
export const READINGS = [SEQUENCE, COMPARISON, TABLE, CROSS, FIELD] as const;

export const WRAP_AROUND = "around";
export const WRAP_EACH = "each";
export const WRAP_NONE = "none";

export type Reading = (typeof READINGS)[number];

export type Wrap = typeof WRAP_AROUND | typeof WRAP_EACH | typeof WRAP_NONE;

export interface ReadingInputs {
	readonly isCollection?: boolean;
	readonly fieldsCount?: number;
	readonly tracks?: boolean;
	readonly isWord?: boolean;
}

export interface ReadProp {
	readonly kind?: unknown;
	readonly describes?: Readonly<Record<string, unknown>>;
	readonly tracks?: unknown;
	readonly type?: unknown;
}

const WRAPS: ReadonlyMap<string, Wrap> = new Map<Reading, Wrap>([
	[SEQUENCE, WRAP_AROUND],
	[COMPARISON, WRAP_EACH],
	[TABLE, WRAP_AROUND],
	[CROSS, WRAP_EACH],
	[FIELD, WRAP_NONE],
]);

const WORD_TYPES: ReadonlySet<unknown> = new Set(["text", "line"]);

export function readingOf({
	isCollection = false,
	fieldsCount = 0,
	tracks = false,
	isWord = false,
}: ReadingInputs = {}): Reading {
	if (!isCollection) return isWord ? CROSS : FIELD;
	if (tracks) return TABLE;
	return fieldsCount >= 2 ? COMPARISON : SEQUENCE;
}

export function wrapOf(reading: string): Wrap {
	return WRAPS.get(reading) ?? WRAP_NONE;
}

export function readingOfProp(prop: ReadProp | null | undefined): Reading {
	return readingOf(inputsOfProp(prop));
}

function inputsOfProp(prop: ReadProp | null | undefined): ReadingInputs {
	const described = Object.values(prop?.describes ?? {});
	const [onlyField] = described;
	return {
		isCollection: prop?.kind === "collection",
		fieldsCount: described.length,
		tracks: prop?.tracks === true,
		isWord: WORD_TYPES.has(described.length === 1 ? typeOfField(onlyField) : prop?.type),
	};
}

function typeOfField(field: unknown): unknown {
	return typeof field === "object" && field !== null && "type" in field ? field.type : undefined;
}
