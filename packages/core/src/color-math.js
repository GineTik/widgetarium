export function colorOf(text) {
	const value = String(text ?? "").trim();
	if (value === "transparent") return CLEAR;
	if (value.startsWith("color(srgb ")) {
		const [r, g, b, a = 1] = numbersIn(value.slice("color(srgb ".length));
		return { r, g, b, a };
	}
	if (!/^rgba?\(/.test(value)) return null;
	const [r, g, b, a = 1] = numbersIn(value);
	return { r: r / 255, g: g / 255, b: b / 255, a };
}

export function contrastOf(one, other) {
	const [high, low] = [luminanceOf(one), luminanceOf(other)].sort((first, second) => second - first);
	return (high + 0.05) / (low + 0.05);
}

export function lightnessOf(color) {
	const y = luminanceOf(color);
	return y > 216 / 24389 ? 116 * Math.cbrt(y) - 16 : (24389 / 27) * y;
}

export function over(top, under) {
	const a = top.a;
	return { r: top.r * a + under.r * (1 - a), g: top.g * a + under.g * (1 - a), b: top.b * a + under.b * (1 - a), a: 1 };
}

export function isClear(text) {
	return colorOf(text)?.a === 0;
}

const CLEAR = { r: 0, g: 0, b: 0, a: 0 };

function numbersIn(text) {
	return text.match(/-?\d*\.?\d+(e-?\d+)?/g)?.map(Number) ?? [];
}

function luminanceOf({ r, g, b }) {
	return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function linear(channel) {
	return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}
