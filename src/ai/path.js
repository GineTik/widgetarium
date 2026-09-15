// TRADE-OFF: a fixed list of the places these tools install into, because an app started from the Dock inherits none of the login shell's PATH and asking a shell costs a process per run
const WHERE_TOOLS_INSTALL = [
	"/opt/homebrew/bin",
	"/usr/local/bin",
	"/usr/bin",
	"/bin",
	"/usr/sbin",
	"/sbin",
	".local/bin",
	".bun/bin",
	".cargo/bin",
	".deno/bin",
	".npm-global/bin",
	"bin",
	".volta/bin",
];

export function searchPath(env = {}) {
	const home = env.HOME ?? "";
	const wanted = WHERE_TOOLS_INSTALL.map((at) => (at.startsWith("/") ? at : `${home}/${at}`));
	const held = String(env.PATH ?? "")
		.split(":")
		.filter(Boolean);
	const seen = new Set(held);
	for (const at of wanted) {
		if (seen.has(at)) continue;
		seen.add(at);
		held.push(at);
	}
	return held.join(":");
}

export function environmentFor(env = {}) {
	return { ...env, PATH: searchPath(env) };
}

export async function whereCommandIs(command, { exists, env = {} }) {
	const named = String(command ?? "").trim();
	if (named === "") return null;
	if (named.includes("/")) return (await exists(named)) ? named : null;
	for (const folder of searchPath(env).split(":")) {
		const at = `${folder}/${named}`;
		if (await exists(at)) return at;
	}
	return null;
}
