import { leaseFor } from "./render.js";

export function createTileShells() {
	const shells = new Map();
	return {
		shellFor(id) {
			const standing = shells.get(id);
			if (standing) return standing;
			const made = document.createElement("div");
			made.className = "wg-drawn";
			shells.set(id, made);
			return made;
		},
		keepOnly(ids) {
			const live = new Set(ids);
			for (const [id, shell] of shells) {
				if (live.has(id)) continue;
				shells.delete(id);
				leaseFor(shell).release();
			}
		},
	};
}
