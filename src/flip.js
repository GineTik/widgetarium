const STILL_PX = 1;
const SPEED_PX_PER_MS = 1.6;
const MOVE_FLOOR_MS = 170;
const MOVE_CEILING_MS = 440;

export function movesFrom(before, after) {
	const moves = {};
	for (const [id, box] of Object.entries(after)) {
		const was = before[id];
		if (!was) continue;
		const dx = was.left - box.left;
		const dy = was.top - box.top;
		if (Math.abs(dx) < STILL_PX && Math.abs(dy) < STILL_PX) continue;
		moves[id] = { dx, dy };
	}
	return moves;
}

export function millisecondsAcross(dx, dy) {
	const away = Math.sqrt(dx * dx + dy * dy);
	return Math.round(Math.min(MOVE_CEILING_MS, Math.max(MOVE_FLOOR_MS, away / SPEED_PX_PER_MS)));
}

export function positionsWithin(root, selector, keyOf) {
	if (!root) return {};
	const origin = root.getBoundingClientRect();
	const places = {};
	for (const node of root.querySelectorAll(selector)) {
		const at = node.getBoundingClientRect();
		places[keyOf(node)] = { left: at.left - origin.left, top: at.top - origin.top };
	}
	return places;
}

export function playMoves(root, moves, find) {
	const held = heldWhereTheyWere(root, moves, find);
	if (held.length === 0) return;
	window.requestAnimationFrame(() => release(held));
}

function heldWhereTheyWere(root, moves, find) {
	const held = [];
	for (const [id, move] of Object.entries(moves)) {
		const node = find(root, id);
		if (!node) continue;
		node.style.transition = "none";
		node.style.transform = `translate(${move.dx}px, ${move.dy}px)`;
		held.push({ node, across: millisecondsAcross(move.dx, move.dy) });
	}
	return held;
}

function release(played) {
	for (const { node, across } of played) {
		node.style.setProperty("--wg-move-ms", `${across}ms`);
		node.style.transition = "";
		node.style.transform = "";
	}
}
