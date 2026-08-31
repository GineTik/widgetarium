// ONE GRAMMAR FOR EVERY PLATFORM. A leading slash means the root of whatever holds the records —
// a vault here, a site elsewhere. Without it the link is relative and the platform resolves it
// the way it resolves any other link a person writes.
export function readLink(link) {
	const text = String(link ?? "").trim();
	if (!text) return null;
	if (!text.startsWith("/")) return { rooted: false, path: text };
	const path = text.slice(1).replace(/\/+$/, "");
	return path ? { rooted: true, path } : null;
}
