import fs from "node:fs/promises";
import path from "node:path";

export interface RegistryReader {
	readonly at: string;
	readonly folder: string | null;
	read(relative: string): Promise<string | null>;
}

const WEB_ADDRESS = /^https?:\/\//;
const TRAILING_SLASHES = /\/+$/;

export function isWebAddress(place: string): boolean {
	return WEB_ADDRESS.test(place);
}

export function readerFor(place: string): RegistryReader {
	return isWebAddress(place) ? webReader(place.replace(TRAILING_SLASHES, "")) : diskReader(place);
}

function diskReader(folder: string): RegistryReader {
	return {
		at: folder,
		folder,
		read: (relative) => fs.readFile(path.join(folder, relative), "utf8").catch(() => null),
	};
}

function webReader(base: string): RegistryReader {
	return {
		at: base,
		folder: null,
		read: async (relative) => {
			const answer = await fetch(`${base}/${relative}`).catch(() => null);
			return answer?.ok === true ? answer.text() : null;
		},
	};
}
