export const askedName = (asked: unknown) =>
	String(asked ?? "")
		.trim()
		.toLowerCase();
