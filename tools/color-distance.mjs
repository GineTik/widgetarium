export function distanceOf(one, other) {
	const here = readOf(one);
	const there = readOf(other);
	if (here === null || there === null || here === CLEAR || there === CLEAR) return null;
	const [first, second] = [labOf(here), labOf(there)];
	return Math.sqrt((first[0] - second[0]) ** 2 + (first[1] - second[1]) ** 2 + (first[2] - second[2]) ** 2);
}

export function alphaOf(worn) {
	const read = readOf(worn);
	if (read === null) return null;
	return read === CLEAR ? 0 : read.alpha;
}

export function colorless(worn) {
	return readOf(worn) === CLEAR;
}

export function unreadable(worn) {
	return readOf(worn) === null;
}

const CLEAR = "clear";

function readOf(worn) {
	const text = worn ?? "";
	const parts = text.match(/-?[\d.]+/g);
	if (!sRGB(text) || !parts || parts.length < 3) return null;
	const alpha = parts.length > 3 ? Number(parts[3]) : 1;
	if (alpha === 0) return CLEAR;
	const full = text.startsWith("color(") ? 1 : 255;
	return { channels: parts.slice(0, 3).map((one) => Number(one) / full), alpha };
}

function sRGB(text) {
	return /^rgba?\(/.test(text) || text.startsWith("color(srgb ");
}

function labOf({ channels }) {
	const [red, green, blue] = channels.map(straightened);
	const x = adjusted((red * 0.4124 + green * 0.3576 + blue * 0.1805) / 0.95047);
	const y = adjusted(red * 0.2126 + green * 0.7152 + blue * 0.0722);
	const z = adjusted((red * 0.0193 + green * 0.1192 + blue * 0.9505) / 1.08883);
	return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

function straightened(channel) {
	return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function adjusted(ratio) {
	return ratio > 0.008856 ? Math.cbrt(ratio) : 7.787 * ratio + 16 / 116;
}
