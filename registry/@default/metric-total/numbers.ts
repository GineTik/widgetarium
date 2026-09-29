export const PLUS = "M10 4.9v10.2M4.9 10h10.2";

export const roundToTenth = (one: number) => Math.round(one * 10) / 10;

export function compactOf(value: number): string {
	if (value < 0) return `\u2212${compactOf(Math.abs(value))}`;
	if (value < 1000) return String(Math.round(value));
	const thousands = value / 1000;
	const places = thousands >= 100 ? 0 : thousands >= 10 ? 1 : 2;
	return `${trimZeros(thousands.toFixed(places))}K`;
}

export function signedOf(value: number): string {
	if (value < 0) return compactOf(value);
	return `+${compactOf(value)}`;
}

function trimZeros(written: string): string {
	if (!written.includes(".")) return written;
	return written.replace(/0+$/, "").replace(/\.$/, "");
}
