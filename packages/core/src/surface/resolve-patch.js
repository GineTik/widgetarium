export function resolvePatch(current, patch) {
	return { ...current, ...(typeof patch === "function" ? patch(current) : patch) };
}
