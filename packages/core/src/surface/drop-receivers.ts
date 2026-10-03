import type { CarriedWidget, PlaceAt } from "../gateway/host.js";
import type { PointerAt } from "./carry.js";

export type { PlaceAt } from "../gateway/host.js";

export interface DropReceiver {
	readonly id: string;
	readonly element: HTMLElement;
	aim(pointer: PointerAt, carried: CarriedWidget): PlaceAt | null;
	rest(): void;
	place(widget: string, at: PlaceAt): boolean;
}

const RECEIVERS = new Map<string, DropReceiver>();

const NO_RECEIVER = "Widgetarium: {widget} was not placed — nothing that takes widgets stands at {at} any more";

export function receiveDrops(receiver: DropReceiver): () => void {
	RECEIVERS.set(receiver.id, receiver);
	return () => {
		if (RECEIVERS.get(receiver.id) === receiver) RECEIVERS.delete(receiver.id);
	};
}

export function receiverAt(pointer: PointerAt): DropReceiver | null {
	const hit = document.elementFromPoint(pointer.clientX, pointer.clientY);
	if (!hit) return null;
	const holding = [...RECEIVERS.values()].filter((receiver) => receiver.element.contains(hit));
	return holding.sort((one, other) => depthOf(other.element) - depthOf(one.element))[0] ?? null;
}

export function restEveryReceiver(): void {
	for (const receiver of RECEIVERS.values()) receiver.rest();
}

export function placeWidget(widget: string, at: PlaceAt): boolean {
	const receiver = RECEIVERS.get(at.kind === "note" ? at.note : at.board);
	if (receiver?.place(widget, at)) return true;
	console.warn(NO_RECEIVER.replace("{widget}", widget).replace("{at}", JSON.stringify(at)));
	return false;
}

function depthOf(element: Element): number {
	let depth = 0;
	for (let at: Element | null = element; at; at = at.parentElement) depth += 1;
	return depth;
}
