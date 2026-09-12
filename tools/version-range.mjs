const ANY = { from: [0, 0, 0], to: null };
const NOTHING = { from: [0, 0, 0], to: [0, 0, 0] };

export function rangesAgree(one, other) {
	return intervalsOf(one).some((held) => intervalsOf(other).some((against) => overlap(held, against)));
}

function intervalsOf(range) {
	const text = String(range ?? "").trim();
	if (text === "") return [ANY];
	return text.split("||").map((part) => everyComparatorIn(part));
}

function everyComparatorIn(text) {
	const written = text.trim().split(/\s+/).filter(Boolean);
	return written.map(intervalOf).reduce(intersect, ANY);
}

function intervalOf(comparator) {
	const found = /^(\^|~|>=|<=|>|<|=)?\s*(.+)$/.exec(comparator.trim());
	const version = found ? readVersion(found[2]) : null;
	if (!version || version.given === 0) return ANY;
	if (found[1] === "^") return { from: version.parts, to: caretCeiling(version) };
	if (found[1] === "~")
		return {
			from: version.parts,
			to: version.given >= 2 ? [version.parts[0], version.parts[1] + 1, 0] : [version.parts[0] + 1, 0, 0],
		};
	if (found[1] === ">=") return { from: version.parts, to: null };
	if (found[1] === ">") return { from: nextAfter(version.parts), to: null };
	if (found[1] === "<=") return { from: [0, 0, 0], to: nextAfter(version.parts) };
	if (found[1] === "<") return { from: [0, 0, 0], to: version.parts };
	return { from: version.parts, to: partialCeiling(version) };
}

function caretCeiling({ parts, given }) {
	const [major, minor, patch] = parts;
	if (major > 0) return [major + 1, 0, 0];
	if (minor > 0) return [0, minor + 1, 0];
	if (given >= 3) return [0, 0, patch + 1];
	return given === 2 ? [0, 1, 0] : [1, 0, 0];
}

function partialCeiling({ parts, given }) {
	if (given >= 3) return nextAfter(parts);
	return given === 2 ? [parts[0], parts[1] + 1, 0] : [parts[0] + 1, 0, 0];
}

function readVersion(text) {
	const written = String(text)
		.replace(/^v/, "")
		.split("+")[0]
		.split("-")[0]
		.split(".")
		.filter((part) => part !== "" && part !== "x" && part !== "X" && part !== "*");
	const parts = [0, 1, 2].map((at) => Number(written[at] ?? 0));
	if (parts.some((number) => !Number.isInteger(number) || number < 0)) return null;
	return { parts, given: written.length };
}

function nextAfter(parts) {
	return [parts[0], parts[1], parts[2] + 1];
}

function intersect(held, against) {
	const from = isBelow(held.from, against.from) ? against.from : held.from;
	const to = ceilingBelow(held.to, against.to);
	return to && !isBelow(from, to) ? NOTHING : { from, to };
}

function ceilingBelow(one, other) {
	if (!one) return other;
	if (!other) return one;
	return isBelow(one, other) ? one : other;
}

function overlap(held, against) {
	const from = isBelow(held.from, against.from) ? against.from : held.from;
	const to = ceilingBelow(held.to, against.to);
	return !to || isBelow(from, to);
}

function isBelow(one, other) {
	for (let at = 0; at < 3; at += 1) {
		if (one[at] !== other[at]) return one[at] < other[at];
	}
	return false;
}
