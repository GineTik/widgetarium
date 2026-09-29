import { targetAt, COLUMN, moveInto, sameTarget } from "../tree.js";

const CARRY_THRESHOLD_PX = 5;
const CARRY_EDGE_PX = 56;
const GHOST_TALLEST_PX = 96;
const GHOST_SHORTEST_PX = 44;
const GHOST_WIDEST_PX = 260;
const GHOST_NARROWEST_PX = 150;
const DWELL_MS = 50;

export function startCarry({ event, page, regions, carryRef, ghostRef, setCarry, commitLayout }) {
	const node = event.target.closest(".wg-tree-cell");
	const id = node.dataset.cell;
	const grabbed = { x: event.clientX, y: event.clientY };
	const box = node.getBoundingClientRect();
	const scroller = scrollerOf(node);
	const scrolledAt = scroller?.scrollTop ?? 0;
	const carried = { spots: [], target: null, latest: grabbed, lifted: grabbed, frame: 0 };

	const roll = () => {
		carried.frame = window.requestAnimationFrame(roll);
		rollTowards(scroller, carried.latest.y);
	};

	const keeper = aimKeeper({
		spots: () => carried.spots,
		target: () => carried.target,
		onTarget: (aimed) => {
			carried.target = aimed;
		},
		onSettled: (aimed) => {
			carried.target = aimed;
			setCarry((was) => ({ ...was, target: aimed }));
		},
	});

	const paintGhost = () => {
		if (!ghostRef.current) return;
		const rolled = (scroller?.scrollTop ?? 0) - scrolledAt;
		const { latest, lifted } = carried;
		ghostRef.current.style.transform = `translate(${latest.x - lifted.x}px, ${latest.y - lifted.y + rolled}px)`;
	};

	const begin = (pointer) => {
		carried.spots = spotsIn(regions.entries(), id);
		carryRef.current.isStarted = true;
		document.body.classList.add("wg-tree-carrying");
		carried.frame = window.requestAnimationFrame(roll);
		keeper.aim(pointer, true);
		carried.lifted = carried.latest;
		setCarry({
			id,
			target: carried.target,
			height: Math.round(box.height),
			ghost: liftGhost({ box, grabbed, lifted: carried.lifted, page }),
		});
	};

	const move = (pointer) => {
		carried.latest = { x: pointer.clientX, y: pointer.clientY };
		if (carryRef.current.isStarted) {
			paintGhost();
			keeper.aim(pointer, false);
			return;
		}
		if (isCarriedFar(grabbed, carried.latest)) begin(pointer);
	};

	const gesture = new AbortController();
	const finish = (isKept) => {
		gesture.abort();
		window.cancelAnimationFrame(carried.frame);
		keeper.rest();
		document.body.classList.remove("wg-tree-carrying");
		const wasStarted = carryRef.current?.isStarted;
		carryRef.current = null;
		if (!isKept || !wasStarted || !carried.target) return setCarry(null);
		commitLayout((held) => moveInto(held, id, carried.target));
		setCarry((was) => ({ ...was, isLanding: true }));
	};
	const abandon = () => finish(false);
	const untilDropped = { signal: gesture.signal };

	carryRef.current = { isStarted: false, stop: abandon };
	window.addEventListener("pointermove", move, untilDropped);
	window.addEventListener("pointerup", () => finish(true), untilDropped);
	window.addEventListener("pointercancel", abandon, untilDropped);
	window.addEventListener("keydown", (held) => held.key === "Escape" && abandon(), untilDropped);
}

function scrollerOf(node) {
	for (let at = node; at && at !== document.body; at = at.parentElement) {
		const flow = getComputedStyle(at).overflowY;
		if ((flow === "auto" || flow === "scroll") && at.scrollHeight > at.clientHeight) return at;
	}
	return document.scrollingElement;
}

function pathFrom(key) {
	return key === "" ? [] : key.split("/").map(Number);
}

function spotBox(node) {
	const at = node.getBoundingClientRect();
	return { left: at.left, top: at.top, right: at.right, bottom: at.bottom };
}

function standsOnScreen(spot) {
	return spot.box.right > spot.box.left && spot.box.bottom > spot.box.top;
}

// TRADE-OFF: the region element is a spot of its own over the same path as the box inside it, so the bare part of a column below its widgets still answers the pointer
function spotsUnder(node, carriedId) {
	const inside = [...node.querySelectorAll("[data-path]")]
		.filter((one) => one.dataset.cell !== carriedId)
		.map((one) => ({
			path: pathFrom(one.dataset.path),
			kind: one.dataset.cell === undefined ? "box" : "leaf",
			dir: one.dataset.dir ?? null,
			box: spotBox(one),
		}))
		.filter(standsOnScreen);
	if (node.dataset.region === undefined) return inside;
	return [
		...inside,
		{
			path: pathFrom(node.dataset.region),
			kind: "box",
			dir: node.querySelector("[data-dir]")?.dataset.dir ?? COLUMN,
			box: spotBox(node),
		},
	];
}

function spotsIn(roots, carriedId) {
	return [...roots].flatMap(([, node]) => spotsUnder(node, carriedId));
}

function rollTowards(scroller, y) {
	if (!scroller) return;
	const edge = scroller.getBoundingClientRect();
	const above = y - edge.top;
	const below = edge.bottom - y;
	if (above < CARRY_EDGE_PX) scroller.scrollTop -= (CARRY_EDGE_PX - above) / 4;
	else if (below < CARRY_EDGE_PX) scroller.scrollTop += (CARRY_EDGE_PX - below) / 4;
}

function ghostFor(box, grabbed) {
	const across = Math.min(Math.max(box.width, GHOST_NARROWEST_PX), GHOST_WIDEST_PX);
	const down = Math.min(Math.max(box.height, GHOST_SHORTEST_PX), GHOST_TALLEST_PX);
	return {
		across,
		down,
		gripAcross: box.width > 0 ? (grabbed.x - box.left) / box.width : 0.5,
		gripDown: box.height > 0 ? (grabbed.y - box.top) / box.height : 0.5,
		liftedFrom: Math.max(box.width / across, box.height / down),
	};
}

function aimKeeper(held) {
	let dwelling = 0;
	const rest = () => {
		window.clearTimeout(dwelling);
		dwelling = 0;
	};
	return {
		rest,
		aim: (pointer, isFirst) => {
			const aimed = targetAt(held.spots(), pointer.clientX, pointer.clientY);
			if (sameTarget(aimed, held.target())) return rest();
			if (isFirst) return held.onTarget(aimed);
			window.clearTimeout(dwelling);
			dwelling = window.setTimeout(() => held.onSettled(aimed), DWELL_MS);
		},
	};
}

function liftGhost({ box, grabbed, lifted, page }) {
	const ghost = ghostFor(box, grabbed);
	return {
		...ghost,
		left: lifted.x - ghost.gripAcross * ghost.across - page.left,
		top: lifted.y - ghost.gripDown * ghost.down - page.top,
	};
}

function isCarriedFar(from, to) {
	return Math.abs(to.x - from.x) + Math.abs(to.y - from.y) >= CARRY_THRESHOLD_PX;
}
