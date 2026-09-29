export interface Rgba {
	readonly r: number;
	readonly g: number;
	readonly b: number;
	readonly a: number;
}

const CLEAR: Rgba = { r: 0, g: 0, b: 0, a: 0 };
const SRGB_PREFIX = "color(srgb ";
const BYTE_MAX = 255;

export function colorOf(text: string | null | undefined): Rgba | null {
	const value = String(text ?? "").trim();
	if (value === "transparent") return CLEAR;
	if (value.startsWith(SRGB_PREFIX)) return channelsOf(numbersIn(value.slice(SRGB_PREFIX.length)), 1);
	if (!/^rgba?\(/.test(value)) return null;
	return channelsOf(numbersIn(value), BYTE_MAX);
}

export function contrastOf(one: Rgba, other: Rgba): number {
	const [oneLuminance, otherLuminance] = [luminanceOf(one), luminanceOf(other)];
	return (Math.max(oneLuminance, otherLuminance) + 0.05) / (Math.min(oneLuminance, otherLuminance) + 0.05);
}

export function lightnessOf(color: Rgba): number {
	const y = luminanceOf(color);
	return y > 216 / 24389 ? 116 * Math.cbrt(y) - 16 : (24389 / 27) * y;
}

export function over(top: Rgba, under: Rgba): Rgba {
	const a = top.a;
	return { r: top.r * a + under.r * (1 - a), g: top.g * a + under.g * (1 - a), b: top.b * a + under.b * (1 - a), a: 1 };
}

export function isClear(text: string | null | undefined): boolean {
	return colorOf(text)?.a === 0;
}

function channelsOf(numbers: readonly number[], channelMax: number): Rgba | null {
	const [r, g, b, a = 1] = numbers;
	if (r === undefined || g === undefined || b === undefined) return null;
	return { r: r / channelMax, g: g / channelMax, b: b / channelMax, a };
}

function numbersIn(text: string): number[] {
	return text.match(/-?\d*\.?\d+(e-?\d+)?/g)?.map(Number) ?? [];
}

function luminanceOf({ r, g, b }: Rgba): number {
	return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function linear(channel: number): number {
	return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}
