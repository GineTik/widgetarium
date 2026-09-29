// TRADE-OFF: durations here, curves in styles.css — JS schedules the beats, so it owns the numbers
const GROW_MS = 220;
const SETTLE_MS = 160;
const EXIT_MS = 160;
const EXIT_FLOOR_WITHOUT_TRANSITION_END_MS = 240;
// TRADE-OFF: later than a slow frame, so a painting browser still animates; a starved one waited 1300ms
const GROW_WAIT_MS = 50;
// TRADE-OFF: 0.9, not 0, because the panel is a place that was already there, not a thing being born
const START_SCALE = 0.9;
const OVERSHOOT_SCALE = 1.05;
// TRADE-OFF: a share of the distance to the press, capped — a press across the screen would else throw it
const PULL_RATIO = 0.18;
const PULL_MAX_PX = 48;
const PRESS_OWNED_WITHIN_MS = 1200;

let lastPointerPress = null;
let watchingPresses = false;

const dialogPress = new WeakMap();
const enterBeats = new WeakMap();

// TRADE-OFF: the document, not a trigger — a dialog opened from state has no element to ask
export function watchPresses() {
	if (watchingPresses) return;
	watchingPresses = true;
	for (const name of ["pointerdown", "mousedown", "click"]) document.addEventListener(name, rememberPointerPress, true);
}

export function enterDialog(node) {
	const found = panelOf(node);
	if (!found || prefersReducedMotion()) return;
	const { overlay, panel } = found;
	const box = panel.getBoundingClientRect();
	if (!isLaidOut(box)) return;

	const press = pressPoint();
	dialogPress.set(panel, press);
	overlay.style.transition = "none";
	overlay.style.backgroundColor = "transparent";
	sitAtPress(panel, seatPulledTowardPress(box, press));

	const beats = [];
	// TRADE-OFF: a flag, not two cancellations — whichever of the frame and the wait arrives first
	let grown = false;
	const start = () => {
		if (grown) return;
		grown = true;
		overlay.style.transition = `background-color ${GROW_MS}ms var(--wg-ease)`;
		overlay.style.backgroundColor = "var(--wg-dialog-scrim)";
		growPastItsSize(panel);
		beats.push(
			setTimeout(() => {
				takeBackOvershoot(panel);
				beats.push(setTimeout(() => restDialog(overlay, panel), SETTLE_MS));
			}, GROW_MS),
		);
	};
	const frame = requestAnimationFrame(start);
	const waited = setTimeout(start, GROW_WAIT_MS);
	enterBeats.set(panel, () => {
		cancelAnimationFrame(frame);
		clearTimeout(waited);
		for (const beat of beats) clearTimeout(beat);
	});
}

export function exitDialog(node, done) {
	const found = panelOf(node);
	if (!found || prefersReducedMotion()) return done();
	const { overlay, panel } = found;
	enterBeats.get(panel)?.();
	pinAtRestBeforeMeasuring(panel);

	const box = panel.getBoundingClientRect();
	if (!isLaidOut(box)) {
		restDialog(overlay, panel);
		return done();
	}

	const seat = seatPulledTowardPress(box, pressItGrewFrom(panel));
	node.style.pointerEvents = "none";
	overlay.style.transition = `background-color ${EXIT_MS}ms var(--wg-ease)`;
	overlay.style.backgroundColor = "transparent";
	panel.style.transition = `translate ${EXIT_MS}ms var(--wg-ease), scale ${EXIT_MS}ms var(--wg-ease), opacity ${EXIT_MS}ms var(--wg-ease)`;
	panel.style.transformOrigin = seat.origin;
	panel.style.translate = `${seat.left}px ${seat.top}px`;
	panel.style.scale = String(START_SCALE);
	panel.style.opacity = "0";

	const finish = (event) => {
		if (event && (event.target !== panel || event.propertyName !== "scale")) return;
		stop();
		done();
	};
	const guard = setTimeout(() => finish(), EXIT_FLOOR_WITHOUT_TRANSITION_END_MS);
	const stop = () => {
		clearTimeout(guard);
		panel.removeEventListener("transitionend", finish);
	};
	panel.addEventListener("transitionend", finish);
}

export function ghostLeftInPortalPlace(node) {
	const found = panelOf(node);
	if (!found) return null;
	enterBeats.get(found.panel)?.();
	const ghost = node.cloneNode(true);
	const copy = panelOf(ghost);
	if (!copy) return null;
	inheritPress(found.panel, copy.panel);
	node.replaceWith(ghost);
	return ghost;
}

function rememberPointerPress(event) {
	if (event.type === "click" && !event.detail) return;
	lastPointerPress = { x: event.clientX, y: event.clientY, at: Date.now() };
}

function prefersReducedMotion() {
	return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

function pressPoint() {
	if (!lastPointerPress || Date.now() - lastPointerPress.at > PRESS_OWNED_WITHIN_MS) return null;
	return { x: lastPointerPress.x, y: lastPointerPress.y };
}

function pressItGrewFrom(panel) {
	return dialogPress.has(panel) ? dialogPress.get(panel) : pressPoint();
}

function inheritPress(from, to) {
	if (dialogPress.has(from)) dialogPress.set(to, dialogPress.get(from));
}

function isLaidOut(box) {
	return Boolean(box.width && box.height);
}

function seatPulledTowardPress(box, press) {
	if (!press) return { origin: "50% 50%", left: 0, top: 0 };
	const pull = (from, to) => Math.max(Math.min((from - to) * PULL_RATIO, PULL_MAX_PX), -PULL_MAX_PX);
	return {
		origin: `${Math.round(press.x - box.left)}px ${Math.round(press.y - box.top)}px`,
		left: Math.round(pull(press.x, box.left + box.width / 2)),
		top: Math.round(pull(press.y, box.top + box.height / 2)),
	};
}

function panelOf(node) {
	const overlay = node?.querySelector?.(".wg-dialog-overlay");
	const panel = overlay?.querySelector(".wg-dialog");
	return panel ? { overlay, panel } : null;
}

function sitAtPress(panel, seat) {
	panel.style.transition = "none";
	panel.style.transformOrigin = seat.origin;
	panel.style.translate = `${seat.left}px ${seat.top}px`;
	panel.style.scale = String(START_SCALE);
	panel.style.opacity = "0";
}

function growPastItsSize(panel) {
	panel.style.transition = `translate ${GROW_MS}ms var(--wg-ease), scale ${GROW_MS}ms var(--wg-spread), opacity ${GROW_MS}ms var(--wg-ease)`;
	panel.style.translate = "0px 0px";
	panel.style.scale = String(OVERSHOOT_SCALE);
	panel.style.opacity = "1";
}

function takeBackOvershoot(panel) {
	panel.style.transition = `scale ${SETTLE_MS}ms var(--wg-ease)`;
	panel.style.scale = "1";
}

function pinAtRestBeforeMeasuring(panel) {
	panel.style.opacity = "1";
	panel.style.scale = "1";
	panel.style.translate = "0px 0px";
}

function restDialog(overlay, panel) {
	panel.style.transition = "";
	panel.style.transformOrigin = "";
	panel.style.translate = "";
	panel.style.scale = "";
	panel.style.opacity = "";
	overlay.style.transition = "";
	overlay.style.backgroundColor = "";
}
