export const SEQUENCE = "sequence";
export const COMPARISON = "comparison";
export const TABLE = "table";
export const CROSS = "cross";
export const FIELD = "field";
export const READINGS = [SEQUENCE, COMPARISON, TABLE, CROSS, FIELD];

export const WRAP_AROUND = "around";
export const WRAP_EACH = "each";
export const WRAP_NONE = "none";

const WRAPS = {
	[SEQUENCE]: WRAP_AROUND,
	[COMPARISON]: WRAP_EACH,
	[TABLE]: WRAP_AROUND,
	[CROSS]: WRAP_EACH,
	[FIELD]: WRAP_NONE,
};

const WORD_TYPES = new Set(["text", "line"]);

export function readingOf({ isCollection = false, fieldsCount = 0, tracks = false, isWord = false } = {}) {
	if (!isCollection) return isWord ? CROSS : FIELD;
	if (tracks) return TABLE;
	return fieldsCount >= 2 ? COMPARISON : SEQUENCE;
}

export function wrapOf(reading) {
	return WRAPS[reading] ?? WRAP_NONE;
}

export function readingOfProp(prop) {
	return readingOf(inputsOfProp(prop));
}

function inputsOfProp(prop) {
	const described = Object.entries(prop?.describes ?? {});
	return {
		isCollection: prop?.kind === "collection",
		fieldsCount: described.length,
		tracks: prop?.tracks === true,
		isWord: WORD_TYPES.has(described.length === 1 ? described[0][1]?.type : prop?.type),
	};
}
