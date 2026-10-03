import type { Carrier, CarriedWidget, CarryPointer, PlaceAt } from "../gateway/host.js";
import { receiverAt, restEveryReceiver } from "./drop-receivers.js";
import type { DropReceiver } from "./drop-receivers.js";

const CARRY_THRESHOLD_PX = 5;
const GHOST_ACROSS_PX = 220;
const GHOST_DOWN_PX = 56;

export const CARRIER: Carrier = { canCarry: true, lift: liftWidget };

interface Gesture {
	readonly from: { readonly x: number; readonly y: number };
	ghostLayer: HTMLElement | null;
	aimed: DropReceiver | null;
	at: PlaceAt | null;
}

function liftWidget(pointer: CarryPointer, carried: CarriedWidget): Promise<PlaceAt | null> {
	if (pointer.button !== 0) return Promise.resolve(null);
	return new Promise((settle) => {
		const gesture = gestureFrom(pointer);
		const listeners = new AbortController();
		const finish = (isKept: boolean): void => {
			listeners.abort();
			endCarry(gesture);
			settle(isKept ? gesture.at : null);
		};
		listenToCarry(listeners.signal, (moved) => carryTo(gesture, moved, carried), finish);
	});
}

function gestureFrom(pointer: CarryPointer): Gesture {
	return { from: { x: pointer.clientX, y: pointer.clientY }, ghostLayer: null, aimed: null, at: null };
}

function listenToCarry(
	signal: AbortSignal,
	move: (moved: PointerEvent) => void,
	finish: (isKept: boolean) => void,
): void {
	window.addEventListener("pointermove", move, { signal });
	window.addEventListener("pointerup", () => finish(true), { signal });
	window.addEventListener("pointercancel", () => finish(false), { signal });
	window.addEventListener("keydown", (pressed) => pressed.key === "Escape" && finish(false), { signal });
}

function carryTo(gesture: Gesture, moved: PointerEvent, carried: CarriedWidget): void {
	if (!gesture.ghostLayer && !isFar(gesture.from, moved)) return;
	gesture.ghostLayer ??= createGhostLayer(carried.label);
	paintGhost(gesture.ghostLayer, moved);
	aim(gesture, moved, carried);
}

function endCarry(gesture: Gesture): void {
	gesture.ghostLayer?.remove();
	restEveryReceiver();
	document.body.classList.remove("wg-tree-carrying");
}

function aim(gesture: Gesture, pointer: PointerEvent, carried: CarriedWidget): void {
	const receiver = receiverAt(pointer);
	if (receiver !== gesture.aimed) gesture.aimed?.rest();
	gesture.aimed = receiver;
	gesture.at = receiver?.aim(pointer, carried) ?? null;
}

function createGhostLayer(label: string): HTMLElement {
	document.body.classList.add("wg-tree-carrying");
	const layer = document.createElement("div");
	layer.className = "wg-root wg-portal wg-carry-layer";
	const ghost = layer.appendChild(document.createElement("div"));
	ghost.className = "wg-tree-ghost is-floating";
	ghost.style.width = `${GHOST_ACROSS_PX}px`;
	ghost.style.height = `${GHOST_DOWN_PX}px`;
	const plate = ghost.appendChild(document.createElement("div"));
	plate.className = "wg-tree-ghost-plate";
	plate.appendChild(document.createElement("b")).textContent = label;
	document.body.appendChild(layer);
	return layer;
}

function paintGhost(layer: HTMLElement, pointer: PointerEvent): void {
	const ghost = layer.firstElementChild;
	if (!(ghost instanceof HTMLElement)) return;
	ghost.style.transform = `translate(${pointer.clientX - GHOST_ACROSS_PX / 2}px, ${pointer.clientY - GHOST_DOWN_PX / 2}px)`;
}

function isFar(from: Gesture["from"], to: PointerEvent): boolean {
	return Math.abs(to.clientX - from.x) + Math.abs(to.clientY - from.y) >= CARRY_THRESHOLD_PX;
}
