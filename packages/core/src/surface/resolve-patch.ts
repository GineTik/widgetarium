export type Patch<Held extends object> = Partial<Held> | ((current: Held) => Partial<Held>);

export function resolvePatch<Held extends object>(current: Held, patch: Patch<Held>): Held {
	return { ...current, ...(typeof patch === "function" ? patch(current) : patch) };
}
