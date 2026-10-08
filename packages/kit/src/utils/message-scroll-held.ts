import type { KeptRow } from "./message-scroll-geometry";
import type { ScrollJump } from "./message-scroll-engine";

export interface Held {
	viewport: HTMLElement | null;
	content: HTMLElement | null;
	isOpen: boolean;
	hasOpened: boolean;
	isFollowing: boolean;
	wasAtEnd: boolean;
	lastTop: number;
	kept: KeptRow | null;
	knownAnchors: ReadonlySet<string>;
	roomAnchor: HTMLElement | null;
	queued: { readonly id: string; readonly jump: ScrollJump | undefined } | null;
	autoscroll: { readonly target: number; readonly timer: ReturnType<typeof setTimeout> } | null;
	rows: Set<HTMLElement>;
	visible: Set<string>;
	rowObserver: IntersectionObserver | null;
	sizes: ResizeObserver | null;
	unwatch: (() => void) | null;
}

type HeldCollections = "knownAnchors" | "rows" | "visible";

const IDLE_HELD: Omit<Held, HeldCollections> = {
	viewport: null,
	content: null,
	isOpen: false,
	hasOpened: false,
	isFollowing: false,
	wasAtEnd: false,
	lastTop: 0,
	kept: null,
	roomAnchor: null,
	queued: null,
	autoscroll: null,
	rowObserver: null,
	sizes: null,
	unwatch: null,
};

export function freshHeld(): Held {
	return { ...IDLE_HELD, knownAnchors: new Set(), rows: new Set(), visible: new Set() };
}
