const WORDS = ["text", "note", "value"];
interface PatternReader {
	readonly text: string;
	at: number;
	readonly seed: number;
}

interface Times {
	readonly count: number;
	readonly wide: boolean;
}

const CLASS_SAMPLE: Readonly<Record<string, string>> = { d: "1", w: "a", s: " ", D: "x", W: "-", S: "x" };
const WORDY = new Set(["a", "x"]);
const MAX_LENGTH = 80;

export function sampleFromPattern(pattern: unknown, seed = 0): string | null {
	if (!pattern) return null;
	const reader: PatternReader = { text: String(pattern), at: 0, seed };
	const built = readAlternation(reader);
	if (built === null || reader.at < reader.text.length) return null;
	const trimmed = built.slice(0, MAX_LENGTH);
	return trimmed.trim() ? trimmed : null;
}

function readAlternation(reader: PatternReader): string | null {
	const first = readSequence(reader);
	if (first === null) return null;
	while (reader.text[reader.at] === "|") {
		reader.at += 1;
		if (readSequence(reader) === null) return null;
	}
	return first;
}

function readSequence(reader: PatternReader): string | null {
	let out = "";
	while (reader.at < reader.text.length) {
		const next = reader.text[reader.at];
		if (next === "|" || next === ")") break;
		const piece = readQuantified(reader);
		if (piece === null) return null;
		out += piece;
	}
	return out;
}

function readQuantified(reader: PatternReader): string | null {
	const atom = readAtom(reader);
	if (atom === null) return null;
	const times = readQuantifier(reader);
	if (times === null) return null;
	if (atom === "") return "";
	if (times.wide && WORDY.has(atom)) return WORDS[reader.seed % WORDS.length] ?? atom;
	return atom.repeat(times.count);
}

function readQuantifier(reader: PatternReader): Times {
	const next = reader.text[reader.at];
	if (next === "?") {
		reader.at += 1;
		return { count: 1, wide: false };
	}
	if (next === "*" || next === "+") {
		reader.at += 1;
		if (reader.text[reader.at] === "?") reader.at += 1;
		return { count: 1, wide: true };
	}
	if (next !== "{") return { count: 1, wide: false };

	const close = reader.text.indexOf("}", reader.at);
	if (close < 0) return { count: 1, wide: false };
	const body = reader.text.slice(reader.at + 1, close);
	if (!/^\d+(,\d*)?$/.test(body)) return { count: 1, wide: false };
	reader.at = close + 1;
	if (reader.text[reader.at] === "?") reader.at += 1;

	const [low = "", high] = body.split(",");
	const least = Number(low);
	const most = high === undefined ? least : high === "" ? least + 2 : Number(high);
	const count = Math.min(Math.max(most, 1), 4);
	return { count, wide: count > 2 };
}

function readAtom(reader: PatternReader): string | null {
	const next = reader.text[reader.at];
	if (next === undefined) return null;

	if (next === "^" || next === "$") {
		reader.at += 1;
		return "";
	}
	if (next === ".") {
		reader.at += 1;
		return "a";
	}
	if (next === "\\") return readEscape(reader);
	if (next === "[") return readClass(reader);
	if (next === "(") return readGroup(reader);
	if (next === ")" || next === "|" || next === "*" || next === "+" || next === "?") return null;

	reader.at += 1;
	return next;
}

function readEscape(reader: PatternReader): string | null {
	const letter = reader.text[reader.at + 1];
	if (letter === undefined) return null;
	reader.at += 2;
	if (letter === "b" || letter === "B") return "";
	if (letter === "n") return " ";
	if (letter === "t") return " ";
	return CLASS_SAMPLE[letter] ?? letter;
}

function readGroup(reader: PatternReader): string | null {
	reader.at += 1;
	if (reader.text.startsWith("?:", reader.at)) reader.at += 2;
	else if (reader.text.startsWith("?<", reader.at)) {
		const close = reader.text.indexOf(">", reader.at);
		if (close < 0) return null;
		reader.at = close + 1;
	} else if (reader.text[reader.at] === "?") return null;

	const inner = readAlternation(reader);
	if (inner === null || reader.text[reader.at] !== ")") return null;
	reader.at += 1;
	return inner;
}

function readClass(reader: PatternReader): string | null {
	const close = findClassEnd(reader);
	if (close < 0) return null;
	const body = reader.text.slice(reader.at + 1, close);
	reader.at = close + 1;
	if (body.startsWith("^")) return "x";

	const range = /^\\?(.)-(.)/.exec(body);
	if (range) return range[1] ?? "";
	const escaped = body.charAt(1);
	if (body.startsWith("\\")) return CLASS_SAMPLE[escaped] ?? escaped;
	return body[0] ?? "x";
}

function findClassEnd(reader: PatternReader): number {
	for (let at = reader.at + 1; at < reader.text.length; at += 1) {
		if (reader.text[at] === "\\") {
			at += 1;
			continue;
		}
		if (reader.text[at] === "]") return at;
	}
	return -1;
}
