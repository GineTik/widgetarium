const NAMESPACE = "widgetarium";

export function markOf(props) {
	const held = props?.[NAMESPACE];
	if (typeof held === "string") return held.trim() === "" ? {} : { kind: held.trim() };
	return typeof held === "object" && held !== null ? held : {};
}

export function withMark(props, patch) {
	return { ...(props ?? {}), [NAMESPACE]: { ...markOf(props), ...patch } };
}
