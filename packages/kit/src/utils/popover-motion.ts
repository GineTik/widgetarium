import { CONTENT_DELAY_MS, CONTENT_MS, EXIT_GUARD_MS, GROW_MS, LAND_MARGIN_MS } from "../constants/popover";
import type { Placement } from "../constants/popover";

type Styled = Element & ElementCSSInlineStyle;

interface Placed {
	readonly flippedX: boolean;
	readonly flippedY: boolean;
	readonly width: number;
	readonly height: number;
}

interface Seat {
	readonly scaleX: number;
	readonly scaleY: number;
	readonly radius: string;
}

interface Paint {
	readonly background: string;
	readonly edge: string;
}

export type StopMotion = () => void;

const SCREEN_MARGIN_PX = 8;

export function prefersReducedMotion(): boolean {
	return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

export function restPanel(panel: HTMLElement, anchor: HTMLElement): void {
	panel.style.transition = "";
	panel.style.transform = "";
	panel.style.borderRadius = "";
	clearMotion(panel);
	anchor.style.visibility = "";
}

export function enterPanel(panel: HTMLElement, anchor: HTMLElement, placement: Placement): StopMotion | undefined {
	clearMotion(panel);
	const placed = placePanel(panel, anchor.getBoundingClientRect(), placement);
	anchor.style.visibility = placement.hidesTrigger ? "hidden" : "";
	if (prefersReducedMotion()) return undefined;
	const seat = seatOnAnchor(anchor, placed);
	const rest = panelPaint(panel);
	sitOnAnchor(panel, seat, anchorPaint(anchor), growthOrigin(placed));

	let landing = 0;
	const frame = requestAnimationFrame(() => {
		commitSeat(panel);
		growPanel(panel, rest);
		landing = setTimeout(() => landPanel(panel), GROW_MS + LAND_MARGIN_MS);
	});
	return () => {
		cancelAnimationFrame(frame);
		clearTimeout(landing);
	};
}

export function exitPanel(panel: HTMLElement, anchor: HTMLElement, done: () => void): StopMotion {
	holdForFold(panel);
	const inner = styledChildOf(panel);
	if (inner) {
		// TRADE-OFF: the fold's own duration — at 120ms the content blinked out ahead of the box
		inner.style.transition = "opacity var(--wg-quick) var(--wg-ease)";
		inner.style.opacity = "0";
	}
	panel.style.transition =
		"transform var(--wg-quick) var(--wg-ease), border-radius var(--wg-quick) var(--wg-ease), opacity var(--wg-press) var(--wg-ease) 80ms";
	panel.style.opacity = "0";
	fold(panel, anchor);

	const finish = (event?: TransitionEvent): void => {
		if (event && (event.target !== panel || event.propertyName !== "transform")) return;
		stop();
		done();
	};
	const guard = setTimeout(() => finish(), EXIT_GUARD_MS);
	const stop = (): void => {
		clearTimeout(guard);
		panel.removeEventListener("transitionend", finish);
	};
	panel.addEventListener("transitionend", finish);
	return stop;
}

function isStyled(node: Element | null): node is Styled {
	return node !== null && "style" in node;
}

function styledChildOf(node: Element): Styled | null {
	const child = node.firstElementChild;
	return isStyled(child) ? child : null;
}

function paintedRadius(node: Element | null): number {
	if (!node) return 0;
	const own = parseFloat(getComputedStyle(node).borderRadius) || 0;
	const before = parseFloat(getComputedStyle(node, "::before").borderRadius) || 0;
	return Math.max(own, before);
}

function transformedAnchorRadius(anchor: Element, rect: DOMRect, scaleX: number, scaleY: number): string {
	const raw = Math.max(paintedRadius(anchor), paintedRadius(anchor.firstElementChild));
	const real = Math.min(raw, Math.min(rect.width, rect.height) / 2);
	return `${real / scaleX}px / ${real / scaleY}px`;
}

function placePanel(panel: HTMLElement, rect: DOMRect, placement: Placement): Placed {
	panel.style.transition = "none";
	panel.style.transform = "none";
	panel.style.left = "0px";
	panel.style.top = "0px";
	panel.style.setProperty("--wg-kit-anchor-width", `${rect.width}px`);
	const zero = panel.getBoundingClientRect();
	const wanted = placement.origin(rect);
	const away = placement.flipped(rect, zero);
	const flippedX = wanted.left + zero.width > window.innerWidth - SCREEN_MARGIN_PX;
	const flippedY = wanted.top + zero.height > window.innerHeight - SCREEN_MARGIN_PX;
	const left = flippedX ? Math.max(SCREEN_MARGIN_PX, away.left) : wanted.left;
	const top = flippedY ? Math.max(SCREEN_MARGIN_PX, away.top) : wanted.top;
	panel.style.left = `${left - zero.left}px`;
	panel.style.top = `${top - zero.top}px`;
	panel.style.setProperty("--wg-kit-pop-available-width", `${window.innerWidth - SCREEN_MARGIN_PX - left}px`);
	panel.style.setProperty("--wg-kit-pop-available-height", `${window.innerHeight - SCREEN_MARGIN_PX - top}px`);
	panel.style.setProperty("--wg-kit-pop-origin", growthOrigin({ flippedX, flippedY }));
	return { flippedX, flippedY, width: zero.width, height: zero.height };
}

function growthOrigin(placed: Pick<Placed, "flippedX" | "flippedY">): string {
	return `${placed.flippedX ? "right" : "left"} ${placed.flippedY ? "bottom" : "top"}`;
}

function fold(panel: HTMLElement, anchor: HTMLElement): void {
	const rect = anchor.getBoundingClientRect();
	const box = panel.getBoundingClientRect();
	const scaleX = rect.width / box.width;
	const scaleY = rect.height / box.height;
	panel.style.transform = `translate(${rect.left - box.left}px, ${rect.top - box.top}px) scale(${scaleX}, ${scaleY})`;
	panel.style.borderRadius = transformedAnchorRadius(anchor, rect, scaleX, scaleY);
}

function holdForFold(panel: HTMLElement): void {
	panel.style.transition = "none";
	panel.style.opacity = "1";
	unstage(panel);
	const held = panel.getBoundingClientRect();
	panel.style.width = `${held.width}px`;
	panel.style.height = `${held.height}px`;
}

function unstage(panel: HTMLElement): void {
	panel.style.animation = "";
	panel.style.translate = "";
	panel.style.scale = "";
	panel.style.transformOrigin = "";
	panel.style.removeProperty("--wg-kit-pop-seed-x");
	panel.style.removeProperty("--wg-kit-pop-seed-y");
}

function clearMotion(panel: HTMLElement): void {
	panel.style.opacity = "";
	panel.style.width = "";
	panel.style.height = "";
	panel.style.backgroundColor = "";
	panel.style.boxShadow = "";
	unstage(panel);
	const inner = styledChildOf(panel);
	if (!inner) return;
	inner.style.transition = "";
	inner.style.opacity = "";
}

function seatOnAnchor(anchor: HTMLElement, placed: Placed): Seat {
	const rect = anchor.getBoundingClientRect();
	const scaleX = placed.width ? rect.width / placed.width : 1;
	const scaleY = placed.height ? rect.height / placed.height : 1;
	return { scaleX, scaleY, radius: transformedAnchorRadius(anchor, rect, scaleX, scaleY) };
}

function edgeOf(skin: CSSStyleDeclaration): string {
	const width = parseFloat(skin.borderTopWidth) || 0;
	if (width > 0) return `inset 0 0 0 ${width}px ${skin.borderTopColor}`;
	return skin.boxShadow && skin.boxShadow !== "none" ? skin.boxShadow : "none";
}

function skinPaint(node: Element, pseudo: string | undefined): Paint | null {
	const skin = getComputedStyle(node, pseudo);
	const paint = { background: skin.backgroundColor || "", edge: edgeOf(skin) };
	const bare =
		paint.edge === "none" &&
		(!paint.background || paint.background === "transparent" || /,\s*0\)\s*$/.test(paint.background));
	return bare ? null : paint;
}

function paintOf(node: Element | null): Paint | null {
	if (!node) return null;
	return skinPaint(node, undefined) ?? skinPaint(node, "::before");
}

function anchorPaint(anchor: HTMLElement): Paint {
	return paintOf(anchor.firstElementChild) ?? paintOf(anchor) ?? { background: "", edge: "none" };
}

function panelPaint(panel: HTMLElement): Paint {
	const skin = getComputedStyle(panel);
	return { background: skin.backgroundColor || "", edge: skin.boxShadow || "none" };
}

function wearPaint(panel: HTMLElement, paint: Paint): void {
	panel.style.backgroundColor = paint.background;
	panel.style.boxShadow = paint.edge;
}

function enterTransition(): string {
	return ["border-radius", "background-color", "box-shadow"]
		.map((name) => `${name} ${GROW_MS}ms var(--wg-ease)`)
		.join(", ");
}

function contentTransition(): string {
	return `opacity ${CONTENT_MS}ms var(--wg-ease) ${CONTENT_DELAY_MS}ms`;
}

function sitOnAnchor(panel: HTMLElement, seat: Seat, paint: Paint, origin: string): void {
	panel.style.transition = "none";
	panel.style.animation = "none";
	panel.style.transformOrigin = origin;
	panel.style.setProperty("--wg-kit-pop-seed-x", `${seat.scaleX}`);
	panel.style.setProperty("--wg-kit-pop-seed-y", `${seat.scaleY}`);
	panel.style.scale = `${seat.scaleX} ${seat.scaleY}`;
	panel.style.borderRadius = seat.radius;
	wearPaint(panel, paint);
	const inner = styledChildOf(panel);
	if (!inner) return;
	inner.style.transition = "none";
	inner.style.opacity = "0";
}

function commitSeat(panel: HTMLElement): void {
	void getComputedStyle(panel).opacity;
}

function growPanel(panel: HTMLElement, paint: Paint): void {
	panel.style.transition = enterTransition();
	panel.style.animation = `wg-kit-pop-bloom ${GROW_MS}ms var(--wg-ease) both`;
	panel.style.scale = "";
	panel.style.borderRadius = "";
	wearPaint(panel, paint);
	const inner = styledChildOf(panel);
	if (!inner) return;
	inner.style.transition = contentTransition();
	inner.style.opacity = "1";
}

function landPanel(panel: HTMLElement): void {
	panel.style.transition = "";
	clearMotion(panel);
}
