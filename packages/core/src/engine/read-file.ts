import type { PassageReader, ReadAnswer } from "../gateway/host.js";

type ReadTarget = { readonly ok: false; readonly failure: string } | { readonly ok: true; readonly link: string };

const OUT_OF_VAULT = /(^|\/)\.\.(\/|$)/;
const MACHINE_PATH = /^(~|[A-Za-z]:[\\/]|\\\\)/;

// TRADE-OFF: one result shape whether it read or not — `text` is empty, never a thrown error
export function refuseRead(failure: string, path: string | null = null, bytes = 0): ReadAnswer {
	return { ok: false, text: "", path, bytes, failure };
}

export function readTarget(link: string | null | undefined): ReadTarget {
	const text = String(link ?? "").trim();
	if (!text) return { ok: false, failure: "there is no file to read" };
	if (MACHINE_PATH.test(text) || OUT_OF_VAULT.test(text)) return { ok: false, failure: `${text} is outside the vault` };
	return { ok: true, link: text };
}

export const UNREADABLE: PassageReader = {
	canRead: false,
	read: async () => refuseRead("nothing here can read a file"),
};
