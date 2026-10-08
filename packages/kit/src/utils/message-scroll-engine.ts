import { AUTOSCROLL_SETTLE_MS, RELEASE_KEYS } from "../constants/message-scroller";
import type { ScrollPosition } from "../constants/message-scroller";
import {
	anchorsIn,
	currentAnchorIdOf,
	distanceToEnd,
	edgesOf,
	endTopOf,
	fitsBelow,
	keptRowOf,
	messageIdOf,
	roomUnder,
	rowById,
	rowsIn,
	shiftOfKept,
	topInScroll,
} from "./message-scroll-geometry";
import { freshHeld } from "./message-scroll-held";
import type { Held } from "./message-scroll-held";
import { listen } from "./dom-listen";
import { clamp } from "./clamp";
import { prefersReducedMotion } from "./reduced-motion";
import { createResizeObserver } from "./resize-watch";

export interface ScrollSettings {
	readonly autoScroll: boolean;
	readonly defaultScrollPosition: ScrollPosition;
	readonly scrollEdgeThreshold: number;
	readonly scrollMargin: number;
	readonly scrollPreviousItemPeek: number;
	readonly preserveScrollOnPrepend: boolean;
}

export interface ScrollReport {
	readonly start: boolean;
	readonly end: boolean;
	readonly autoscrolling: boolean;
	readonly pending: boolean;
	readonly currentAnchorId: string | null;
	readonly visibleMessageIds: readonly string[];
}

export interface ScrollJump {
	readonly behavior?: ScrollBehavior | undefined;
}

export interface ScrollEngine {
	readonly attachViewport: (node: HTMLElement | null) => void;
	readonly attachContent: (node: HTMLElement | null) => void;
	readonly watchRow: (node: HTMLElement) => () => void;
	readonly scrollToEnd: (jump?: ScrollJump) => boolean;
	readonly scrollToStart: (jump?: ScrollJump) => boolean;
	readonly scrollToMessage: (id: string, jump?: ScrollJump) => boolean;
}

export const OPENING_REPORT: ScrollReport = {
	start: false,
	end: false,
	autoscrolling: false,
	pending: true,
	currentAnchorId: null,
	visibleMessageIds: [],
};

type AttachedNodes = { readonly viewport?: HTMLElement | null; readonly content?: HTMLElement | null };

const PASSIVE: AddEventListenerOptions = { passive: true };

interface Run {
	readonly held: Held;
	readonly settingsOf: () => ScrollSettings;
	readonly report: () => void;
}

export function createScrollEngine(
	settingsOf: () => ScrollSettings,
	onReport: (report: ScrollReport) => void,
): ScrollEngine {
	const held = freshHeld();
	const run: Run = { held, settingsOf, report: () => onReport(reportOf(held, settingsOf())) };
	return {
		attachViewport: (node) => attachNodes(run, { viewport: node }),
		attachContent: (node) => attachNodes(run, { content: node }),
		watchRow: (node) => watchRow(run, node),
		scrollToEnd: (jump) => scrollToEdge(run, "end", jump),
		scrollToStart: (jump) => scrollToEdge(run, "start", jump),
		scrollToMessage: (id, jump) => scrollToMessage(run, id, jump),
	};
}

function attachNodes(run: Run, nodes: AttachedNodes): void {
	const { held } = run;
	if (held.isOpen && isAttached(held, nodes)) return;
	if (nodes.viewport === null || nodes.content === null) {
		detachNodes(run, nodes);
		return;
	}
	if (nodes.viewport) held.viewport = nodes.viewport;
	if (nodes.content) held.content = nodes.content;
	startEngine(run);
}

function isAttached(held: Held, nodes: AttachedNodes): boolean {
	return nodes.viewport === held.viewport || nodes.content === held.content;
}

function detachNodes(run: Run, nodes: AttachedNodes): void {
	stopEngine(run);
	if (nodes.viewport === null) run.held.viewport = null;
	if (nodes.content === null) run.held.content = null;
}

function startEngine(run: Run): void {
	const { viewport, content, isOpen } = run.held;
	if (!viewport || !content || isOpen) return;
	openEngine(run, viewport, content);
	if (!jumpToQueued(run, viewport, content)) settleScroll(run);
}

function openEngine(run: Run, viewport: HTMLElement, content: HTMLElement): void {
	const { held } = run;
	held.isOpen = true;
	if (!held.hasOpened) viewport.scrollTop = openingTopOf(viewport, content, run.settingsOf());
	held.hasOpened = true;
	held.knownAnchors = new Set(anchorsIn(content).map(messageIdOf));
	held.rowObserver = createRowObserver(run, viewport);
	held.unwatch = watchViewport(run, viewport, content);
	observeRows(held);
}

function observeRows(held: Held): void {
	for (const row of held.rows) {
		held.rowObserver?.observe(row);
		held.sizes?.observe(row);
	}
}

function stopEngine(run: Run): void {
	const { held } = run;
	held.unwatch?.();
	held.rowObserver?.disconnect();
	stopAutoscroll(held);
	held.unwatch = null;
	held.rowObserver = null;
	held.isOpen = false;
}

function openingTopOf(viewport: HTMLElement, content: HTMLElement, settings: ScrollSettings): number {
	if (settings.defaultScrollPosition === "start") return 0;
	const anchor = anchorsIn(content).at(-1);
	if (settings.defaultScrollPosition === "end" || !anchor || fitsBelow(anchor, viewport)) return endTopOf(viewport);
	return topInScroll(viewport, anchor) - settings.scrollPreviousItemPeek;
}

function watchViewport(run: Run, viewport: HTMLElement, content: HTMLElement): () => void {
	const unwatchSizes = watchSizes(run, viewport, content);
	const unlisten = [
		listen(viewport, "scroll", () => handleScroll(run), PASSIVE),
		listen(viewport, "wheel", (event) => tookOver(run, event.deltaY < 0), PASSIVE),
		listen(viewport, "keydown", (event) => handleReleaseKey(run, event)),
		listen(viewport, "touchstart", () => tookOver(run, false), PASSIVE),
		listen(viewport, "scrollend", () => finishAutoscroll(run)),
	];
	return () => {
		unwatchSizes();
		for (const stop of unlisten) stop();
	};
}

function watchSizes(run: Run, viewport: HTMLElement, content: HTMLElement): () => void {
	const sizes = createResizeObserver(() => handleResize(run));
	sizes?.observe(content);
	sizes?.observe(viewport);
	run.held.sizes = sizes;
	return () => {
		sizes?.disconnect();
		run.held.sizes = null;
	};
}

function handleReleaseKey(run: Run, event: KeyboardEvent): void {
	if (RELEASE_KEYS.includes(event.key) || (event.key === " " && event.shiftKey)) tookOver(run, true);
}

function createRowObserver(run: Run, viewport: HTMLElement): IntersectionObserver | null {
	if (typeof IntersectionObserver !== "function") return null;
	return new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				const id = messageIdOf(entry.target);
				if (entry.isIntersecting) run.held.visible.add(id);
				else run.held.visible.delete(id);
			}
			run.report();
		},
		{ root: viewport },
	);
}

function watchRow(run: Run, row: HTMLElement): () => void {
	const { held } = run;
	const id = messageIdOf(row);
	held.rows.add(row);
	held.rowObserver?.observe(row);
	held.sizes?.observe(row);
	return () => {
		held.rows.delete(row);
		held.rowObserver?.unobserve(row);
		held.sizes?.unobserve(row);
		held.visible.delete(id);
	};
}

function handleScroll(run: Run): void {
	const { held } = run;
	const { viewport } = held;
	if (!viewport) return;
	if (held.autoscroll && Math.abs(viewport.scrollTop - held.autoscroll.target) <= 1) finishAutoscroll(run);
	else if (!held.autoscroll && viewport.scrollTop < held.lastTop - 1 && !isAtEnd(run, viewport))
		held.isFollowing = false;
	settleScroll(run);
}

function tookOver(run: Run, isLeavingTheEnd: boolean): void {
	stopAutoscroll(run.held);
	if (isLeavingTheEnd) run.held.isFollowing = false;
	run.report();
}

function handleResize(run: Run): void {
	const { held } = run;
	const { viewport, content } = held;
	if (!viewport || !content || !held.isOpen) return;
	const fresh = takeFreshAnchor(held, content);
	if (jumpToQueued(run, viewport, content)) return;
	if (fresh && (held.isFollowing || held.wasAtEnd)) placeTurn(run, viewport, fresh);
	else holdPlace(run, viewport, content);
	settleScroll(run);
}

function takeFreshAnchor(held: Held, content: HTMLElement): HTMLElement | null {
	const anchors = anchorsIn(content);
	const last = anchors.at(-1);
	const isFresh = last !== undefined && !held.knownAnchors.has(messageIdOf(last));
	held.knownAnchors = new Set(anchors.map(messageIdOf));
	return isFresh ? last : null;
}

function placeTurn(run: Run, viewport: HTMLElement, anchor: HTMLElement): void {
	run.held.roomAnchor = anchor;
	widenRoom(run);
	viewport.scrollTop = topInScroll(viewport, anchor) - run.settingsOf().scrollPreviousItemPeek;
}

function holdPlace(run: Run, viewport: HTMLElement, content: HTMLElement): void {
	const { held } = run;
	widenRoom(run);
	if (held.isFollowing) {
		viewport.scrollTop = endTopOf(viewport);
		return;
	}
	if (!run.settingsOf().preserveScrollOnPrepend || !held.kept || held.autoscroll) return;
	const shift = shiftOfKept(viewport, content, held.kept);
	if (Math.abs(shift) > 0.5) viewport.scrollTop += shift;
}

function widenRoom(run: Run): void {
	const { roomAnchor, content, viewport } = run.held;
	if (!roomAnchor || !content || !viewport) return;
	if (!roomAnchor.isConnected) {
		run.held.roomAnchor = null;
		content.style.minHeight = "";
		return;
	}
	const room = `${Math.round(roomUnder(roomAnchor, content, viewport, run.settingsOf().scrollPreviousItemPeek))}px`;
	if (content.style.minHeight !== room) content.style.minHeight = room;
}

function jumpToQueued(run: Run, viewport: HTMLElement, content: HTMLElement): boolean {
	const { queued } = run.held;
	const row = queued ? rowById(content, queued.id) : null;
	if (!queued || !row) return false;
	run.held.queued = null;
	jumpTo(run, topInScroll(viewport, row) - run.settingsOf().scrollMargin, queued.jump);
	return true;
}

function scrollToEdge(run: Run, edge: "start" | "end", jump: ScrollJump | undefined): boolean {
	const { viewport } = run.held;
	if (!viewport) return false;
	run.held.isFollowing = edge === "end" && run.settingsOf().autoScroll;
	jumpTo(run, edge === "end" ? endTopOf(viewport) : 0, jump);
	return true;
}

function scrollToMessage(run: Run, id: string, jump: ScrollJump | undefined): boolean {
	if (id === "") return false;
	const { held } = run;
	const row = held.content ? rowById(held.content, id) : null;
	held.isFollowing = false;
	if (!row || !held.viewport || !held.isOpen) {
		held.queued = { id, jump };
		return true;
	}
	jumpTo(run, topInScroll(held.viewport, row) - run.settingsOf().scrollMargin, jump);
	return true;
}

function jumpTo(run: Run, top: number, jump: ScrollJump | undefined): void {
	const { held } = run;
	const { viewport } = held;
	if (!viewport) return;
	const target = clamp(top, 0, endTopOf(viewport));
	stopAutoscroll(held);
	if (!isSmooth(jump) || Math.abs(target - viewport.scrollTop) <= 1) {
		viewport.scrollTop = target;
		settleScroll(run);
		return;
	}
	held.autoscroll = { target, timer: setTimeout(() => finishAutoscroll(run), AUTOSCROLL_SETTLE_MS) };
	viewport.scrollTo({ top: target, behavior: "smooth" });
	run.report();
}

function finishAutoscroll(run: Run): void {
	const { held } = run;
	if (!held.autoscroll) return;
	stopAutoscroll(held);
	if (held.isFollowing && held.viewport) held.viewport.scrollTop = endTopOf(held.viewport);
	settleScroll(run);
}

function stopAutoscroll(held: Held): void {
	if (held.autoscroll) clearTimeout(held.autoscroll.timer);
	held.autoscroll = null;
}

function settleScroll(run: Run): void {
	const { held } = run;
	const { viewport, content } = held;
	if (!viewport || !content) return;
	held.wasAtEnd = isAtEnd(run, viewport);
	if (held.wasAtEnd && !held.autoscroll) held.isFollowing = run.settingsOf().autoScroll;
	held.lastTop = viewport.scrollTop;
	held.kept = keptRowOf(viewport, content);
	run.report();
}

function isAtEnd(run: Run, viewport: HTMLElement): boolean {
	return distanceToEnd(viewport) <= run.settingsOf().scrollEdgeThreshold;
}

function isSmooth(jump: ScrollJump | undefined): boolean {
	if ((jump?.behavior ?? "smooth") !== "smooth") return false;
	return !prefersReducedMotion();
}

function reportOf(held: Held, settings: ScrollSettings): ScrollReport {
	const { viewport, content } = held;
	if (!viewport || !content || !held.isOpen) return OPENING_REPORT;
	return {
		...edgesOf(viewport, settings.scrollEdgeThreshold),
		autoscrolling: held.autoscroll !== null,
		pending: false,
		currentAnchorId: currentAnchorIdOf(viewport, content, settings.scrollPreviousItemPeek),
		visibleMessageIds: rowsIn(content)
			.map(messageIdOf)
			.filter((id) => held.visible.has(id)),
	};
}
