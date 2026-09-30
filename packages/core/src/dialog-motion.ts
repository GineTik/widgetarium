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
const PRESS_EVENTS = ["pointerdown", "mousedown", "click"] as const;
const ELEMENT_NODE_TYPE = 1;

interface PressPoint {
	readonly x: number;
	readonly y: number;
}

interface TimedPress extends PressPoint {
	readonly at: number;
}

interface Seat {
	readonly origin: string;
	readonly left: number;
	readonly top: number;
}

interface DialogPanel {
	readonly overlay: HTMLElement;
	readonly panel: HTMLElement;
}

let lastPointerPress: TimedPress | null = null;
let watchingPresses = false;

const dialogPress = new WeakMap<HTMLElement, PressPoint | null>();
const enterBeats = new WeakMap<HTMLElement, () => void>();

// TRADE-OFF: the document, not a trigger — a dialog opened from state has no element to ask
export function watchPresses(): void {
	if (watchingPresses) return;
	watchingPresses = true;
	for (const name of PRESS_EVENTS) document.addEventListener(name, rememberPointerPress, true);
}

export function enterDialog(node: ParentNode | null | undefined): void {
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

	const beats: number[] = [];
	// TRADE-OFF: a flag, not two cancellations — whichever of the frame and the wait arrives first
	let grown = false;
	const start = (): void => {
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

export function exitDialog(node: HTMLElement, done: () => void): void {
	const found = panelOf(node);
	if (!found || prefersReducedMotion()) {
		done();
		return;
	}
	const { overlay, panel } = found;
	enterBeats.get(panel)?.();
	pinAtRestBeforeMeasuring(panel);

	const box = panel.getBoundingClientRect();
	if (!isLaidOut(box)) {
		restDialog(overlay, panel);
		done();
		return;
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

	const finish = (event?: TransitionEvent): void => {
		if (event && (event.target !== panel || event.propertyName !== "scale")) return;
		stop();
		done();
	};
	const guard = setTimeout(() => finish(), EXIT_FLOOR_WITHOUT_TRANSITION_END_MS);
	const stop = (): void => {
		clearTimeout(guard);
		panel.removeEventListener("transitionend", finish);
	};
	panel.addEventListener("transitionend", finish);
}

export function ghostLeftInPortalPlace(node: HTMLElement): HTMLElement | null {
	const found = panelOf(node);
	if (!found) return null;
	enterBeats.get(found.panel)?.();
	const ghost = node.cloneNode(true);
	if (!isHtmlElement(ghost)) return null;
	const copy = panelOf(ghost);
	if (!copy) return null;
	inheritPress(found.panel, copy.panel);
	node.replaceWith(ghost);
	return ghost;
}

function rememberPointerPress(event: MouseEvent): void {
	if (event.type === "click" && !event.detail) return;
	lastPointerPress = { x: event.clientX, y: event.clientY, at: Date.now() };
}

function prefersReducedMotion(): boolean {
	return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

function pressPoint(): PressPoint | null {
	if (!lastPointerPress || Date.now() - lastPointerPress.at > PRESS_OWNED_WITHIN_MS) return null;
	return { x: lastPointerPress.x, y: lastPointerPress.y };
}

function pressItGrewFrom(panel: HTMLElement): PressPoint | null {
	const remembered = dialogPress.get(panel);
	return remembered === undefined ? pressPoint() : remembered;
}

function inheritPress(from: HTMLElement, to: HTMLElement): void {
	const remembered = dialogPress.get(from);
	if (remembered !== undefined) dialogPress.set(to, remembered);
}

function isLaidOut(box: DOMRect): boolean {
	return Boolean(box.width && box.height);
}

function isHtmlElement(node: Node): node is HTMLElement {
	return node.nodeType === ELEMENT_NODE_TYPE && "style" in node;
}

function seatPulledTowardPress(box: DOMRect, press: PressPoint | null): Seat {
	if (!press) return { origin: "50% 50%", left: 0, top: 0 };
	const pull = (from: number, to: number): number =>
		Math.max(Math.min((from - to) * PULL_RATIO, PULL_MAX_PX), -PULL_MAX_PX);
	return {
		origin: `${Math.round(press.x - box.left)}px ${Math.round(press.y - box.top)}px`,
		left: Math.round(pull(press.x, box.left + box.width / 2)),
		top: Math.round(pull(press.y, box.top + box.height / 2)),
	};
}

function panelOf(node: ParentNode | null | undefined): DialogPanel | null {
	const overlay = node?.querySelector?.<HTMLElement>(".wg-dialog-overlay");
	const panel = overlay?.querySelector<HTMLElement>(".wg-dialog");
	return overlay && panel ? { overlay, panel } : null;
}

function sitAtPress(panel: HTMLElement, seat: Seat): void {
	panel.style.transition = "none";
	panel.style.transformOrigin = seat.origin;
	panel.style.translate = `${seat.left}px ${seat.top}px`;
	panel.style.scale = String(START_SCALE);
	panel.style.opacity = "0";
}

function growPastItsSize(panel: HTMLElement): void {
	panel.style.transition = `translate ${GROW_MS}ms var(--wg-ease), scale ${GROW_MS}ms var(--wg-spread), opacity ${GROW_MS}ms var(--wg-ease)`;
	panel.style.translate = "0px 0px";
	panel.style.scale = String(OVERSHOOT_SCALE);
	panel.style.opacity = "1";
}

function takeBackOvershoot(panel: HTMLElement): void {
	panel.style.transition = `scale ${SETTLE_MS}ms var(--wg-ease)`;
	panel.style.scale = "1";
}

function pinAtRestBeforeMeasuring(panel: HTMLElement): void {
	panel.style.opacity = "1";
	panel.style.scale = "1";
	panel.style.translate = "0px 0px";
}

function restDialog(overlay: HTMLElement, panel: HTMLElement): void {
	panel.style.transition = "";
	panel.style.transformOrigin = "";
	panel.style.translate = "";
	panel.style.scale = "";
	panel.style.opacity = "";
	overlay.style.transition = "";
	overlay.style.backgroundColor = "";
}
