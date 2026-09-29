export function textOf(value: unknown): string | undefined {
	if (value === undefined || value === null) return undefined;
	const said = String(value).trim();
	return said === "" ? undefined : said;
}
