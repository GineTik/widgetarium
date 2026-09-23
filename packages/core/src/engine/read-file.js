// CONTEXT: reading a file a widget NAMES is its own entity, neither navigation nor the passage

// TRADE-OFF: one result shape whether it read or not — `text` is empty, never a thrown error
export function refusedRead(failure, path = null, bytes = 0) {
	return { ok: false, text: "", path, bytes, failure };
}

// CONTEXT: a walk out, a home directory and a drive letter all name somebody's machine
const OUT_OF_VAULT = /(^|\/)\.\.(\/|$)/;
const MACHINE_PATH = /^(~|[A-Za-z]:[\\/]|\\\\)/;

export function readTarget(link) {
	const text = String(link ?? "").trim();
	if (!text) return { ok: false, failure: "there is no file to read" };
	if (MACHINE_PATH.test(text) || OUT_OF_VAULT.test(text)) return { ok: false, failure: `${text} is outside the vault` };
	return { ok: true, link: text };
}

// CONTEXT: a widget never asks whether it HAS a reader, only whether it may use one
export const UNREADABLE = {
	canRead: false,
	read: async () => refusedRead("nothing here can read a file"),
};
