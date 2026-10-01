type Triple = readonly [number, number, number];

interface Interval {
	readonly from: Triple;
	readonly to: Triple | null;
}

interface ReadVersion {
	readonly parts: Triple;
	readonly given: number;
}

const ANY: Interval = { from: [0, 0, 0], to: null };
const NOTHING: Interval = { from: [0, 0, 0], to: [0, 0, 0] };

export function rangesAgree(one: unknown, other: unknown): boolean {
	return intervalsOf(one).some((held) => intervalsOf(other).some((against) => overlap(held, against)));
}

function intervalsOf(range: unknown): Interval[] {
	const text = String(range ?? "").trim();
	if (text === "") return [ANY];
	return text.split("||").map((part) => everyComparatorIn(part));
}

function everyComparatorIn(text: string): Interval {
	const written = text.trim().split(/\s+/).filter(Boolean);
	return written.map(intervalOf).reduce(intersect, ANY);
}

function intervalOf(comparator: string): Interval {
	const found = /^(\^|~|>=|<=|>|<|=)?\s*(.+)$/.exec(comparator.trim());
	const version = found ? readVersion(found[2] ?? "") : null;
	if (!found || !version || version.given === 0) return ANY;
	const [major, minor] = version.parts;
	if (found[1] === "^") return { from: version.parts, to: caretCeiling(version) };
	if (found[1] === "~")
		return {
			from: version.parts,
			to: version.given >= 2 ? [major, minor + 1, 0] : [major + 1, 0, 0],
		};
	if (found[1] === ">=") return { from: version.parts, to: null };
	if (found[1] === ">") return { from: nextAfter(version.parts), to: null };
	if (found[1] === "<=") return { from: [0, 0, 0], to: nextAfter(version.parts) };
	if (found[1] === "<") return { from: [0, 0, 0], to: version.parts };
	return { from: version.parts, to: partialCeiling(version) };
}

function caretCeiling({ parts, given }: ReadVersion): Triple {
	const [major, minor, patch] = parts;
	if (major > 0) return [major + 1, 0, 0];
	if (minor > 0) return [0, minor + 1, 0];
	if (given >= 3) return [0, 0, patch + 1];
	return given === 2 ? [0, 1, 0] : [1, 0, 0];
}

function partialCeiling({ parts, given }: ReadVersion): Triple {
	if (given >= 3) return nextAfter(parts);
	return given === 2 ? [parts[0], parts[1] + 1, 0] : [parts[0] + 1, 0, 0];
}

function readVersion(text: string): ReadVersion | null {
	const written =
		String(text)
			.replace(/^v/, "")
			.split("+")[0]
			?.split("-")[0]
			?.split(".")
			.filter((part) => part !== "" && part !== "x" && part !== "X" && part !== "*") ?? [];
	const parts: Triple = [Number(written[0] ?? 0), Number(written[1] ?? 0), Number(written[2] ?? 0)];
	if (parts.some((number) => !Number.isInteger(number) || number < 0)) return null;
	return { parts, given: written.length };
}

function nextAfter(parts: Triple): Triple {
	return [parts[0], parts[1], parts[2] + 1];
}

function intersect(held: Interval, against: Interval): Interval {
	const from = isBelow(held.from, against.from) ? against.from : held.from;
	const to = ceilingBelow(held.to, against.to);
	return to && !isBelow(from, to) ? NOTHING : { from, to };
}

function ceilingBelow(one: Triple | null, other: Triple | null): Triple | null {
	if (!one) return other;
	if (!other) return one;
	return isBelow(one, other) ? one : other;
}

function overlap(held: Interval, against: Interval): boolean {
	const from = isBelow(held.from, against.from) ? against.from : held.from;
	const to = ceilingBelow(held.to, against.to);
	return !to || isBelow(from, to);
}

function isBelow(one: Triple, other: Triple): boolean {
	for (let at = 0; at < 3; at += 1) {
		const mine = one[at] ?? 0;
		const theirs = other[at] ?? 0;
		if (mine !== theirs) return mine < theirs;
	}
	return false;
}
