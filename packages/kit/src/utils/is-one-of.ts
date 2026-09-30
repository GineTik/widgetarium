export function isOneOf<W>(allowed: readonly W[], said: unknown): said is W {
	return allowed.some((word) => word === said);
}
