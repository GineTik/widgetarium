import { leaseFor } from "./render.js";

export interface TileShells {
	shellFor(id: string): HTMLDivElement;
	keepOnly(ids: readonly string[]): void;
}

export function createTileShells(): TileShells {
	const shells = new Map<string, HTMLDivElement>();
	return {
		shellFor(id) {
			const standing = shells.get(id);
			if (standing) return standing;
			const made = shellElement();
			shells.set(id, made);
			return made;
		},
		keepOnly(ids) {
			releaseShellsGone(shells, new Set(ids));
		},
	};
}

function shellElement(): HTMLDivElement {
	const made = document.createElement("div");
	made.className = "wg-drawn";
	return made;
}

function releaseShellsGone(shells: Map<string, HTMLDivElement>, live: ReadonlySet<string>): void {
	for (const [id, shell] of shells) {
		if (live.has(id)) continue;
		shells.delete(id);
		leaseFor(shell).release();
	}
}
