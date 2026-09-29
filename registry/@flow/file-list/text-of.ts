export function textOf(value: unknown): string | null {
	if (value === undefined || value === null) return null;
	const said = String(value).trim();
	return said === "" ? null : said;
}
