import { leaseFor } from "./render.js";

function shellElement() {
	const made = document.createElement("div");
	made.className = "wg-drawn";
	return made;
}

function releaseShellsGone(shells, live) {
	for (const [id, shell] of shells) {
		if (live.has(id)) continue;
		shells.delete(id);
		leaseFor(shell).release();
	}
}

export function createTileShells() {
	const shells = new Map();
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
