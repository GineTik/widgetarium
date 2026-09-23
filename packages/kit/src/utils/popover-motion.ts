import { CONTENT_DELAY_MS, CONTENT_MS, EXIT_GUARD_MS, GROW_MS, LAND_MARGIN_MS } from "../constants/popover";

function paintedRadius(node) {
	if (!node) return 0;
	const own = parseFloat(getComputedStyle(node).borderRadius) || 0;
	const before = parseFloat(getComputedStyle(node, "::before").borderRadius) || 0;
	return Math.max(own, before);
}

function anchorRadius(anchor, rect, scaleX, scaleY) {
	// CONTEXT: a radius is scaled by the transform, so 999px on a shrunk panel renders as ~4px
	const raw = Math.max(paintedRadius(anchor), paintedRadius(anchor.firstElementChild));
	const real = Math.min(raw, Math.min(rect.width, rect.height) / 2);
	return `${real / scaleX}px / ${real / scaleY}px`;
}

export function prefersReducedMotion() {
	return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

function placePanel(panel, rect, placement) {
	panel.style.transition = "none";
	panel.style.transform = "none";
	panel.style.left = "0px";
	panel.style.top = "0px";
	// CONTEXT: only the kit has measured the trigger, and a menu under a row usually matches it
	panel.style.setProperty("--wg-kit-anchor-width", `${rect.width}px`);
	// CONTEXT: measured AFTER that floor lands, or the seed is scaled against a box the panel never wears
	const zero = panel.getBoundingClientRect();
	const marginPx = 8;
	const wanted = placement.origin(rect, zero);
	const away = placement.flipped(rect, zero);
	let { left, top } = wanted;
	let flippedX = false;
	let flippedY = false;
	if (left + zero.width > window.innerWidth - marginPx) {
		left = Math.max(marginPx, away.left);
		flippedX = true;
	}
	if (top + zero.height > window.innerHeight - marginPx) {
		top = Math.max(marginPx, away.top);
		flippedY = true;
	}
	panel.style.left = `${left - zero.left}px`;
	panel.style.top = `${top - zero.top}px`;
	// CONTEXT: the growth leans on the corner the panel actually ended up on, screen edge included
	return { flippedX, flippedY, width: zero.width, height: zero.height };
}

function growthOrigin(placed) {
	return `${placed.flippedX ? "right" : "left"} ${placed.flippedY ? "bottom" : "top"}`;
}

function fold(panel, anchor) {
	const rect = anchor.getBoundingClientRect();
	const box = panel.getBoundingClientRect();
	const scaleX = rect.width / box.width;
	const scaleY = rect.height / box.height;
	panel.style.transform = `translate(${rect.left - box.left}px, ${rect.top - box.top}px) scale(${scaleX}, ${scaleY})`;
	panel.style.borderRadius = anchorRadius(anchor, rect, scaleX, scaleY);
}

function unstage(panel) {
	panel.style.animation = "";
	panel.style.translate = "";
	panel.style.scale = "";
	panel.style.transformOrigin = "";
	panel.style.removeProperty("--wg-kit-pop-seed-x");
	panel.style.removeProperty("--wg-kit-pop-seed-y");
}

function clearMotion(panel) {
	panel.style.opacity = "";
	panel.style.width = "";
	panel.style.height = "";
	panel.style.backgroundColor = "";
	panel.style.boxShadow = "";
	unstage(panel);
	const inner = panel.firstElementChild;
	if (!inner) return;
	inner.style.transition = "";
	inner.style.opacity = "";
}

export function restPanel(panel, anchor) {
	panel.style.transition = "";
	panel.style.transform = "";
	panel.style.borderRadius = "";
	clearMotion(panel);
	anchor.style.visibility = "";
}

function seatOnAnchor(anchor, placed) {
	const rect = anchor.getBoundingClientRect();
	const scaleX = placed.width ? rect.width / placed.width : 1;
	const scaleY = placed.height ? rect.height / placed.height : 1;
	return { rect, scaleX, scaleY, radius: anchorRadius(anchor, rect, scaleX, scaleY) };
}

function edgeOf(skin) {
	const width = parseFloat(skin.borderTopWidth) || 0;
	if (width > 0) return `inset 0 0 0 ${width}px ${skin.borderTopColor}`;
	return skin.boxShadow && skin.boxShadow !== "none" ? skin.boxShadow : "none";
}

function skinPaint(node, pseudo) {
	const skin = getComputedStyle(node, pseudo);
	const paint = { background: skin.backgroundColor || "", edge: edgeOf(skin) };
	const bare =
		paint.edge === "none" &&
		(!paint.background || paint.background === "transparent" || /,\s*0\)\s*$/.test(paint.background));
	return bare ? null : paint;
}

function paintOf(node) {
	if (!node) return null;
	return skinPaint(node, undefined) ?? skinPaint(node, "::before");
}

function anchorPaint(anchor) {
	return paintOf(anchor.firstElementChild) ?? paintOf(anchor) ?? { background: "", edge: "none" };
}

function panelPaint(panel) {
	const skin = getComputedStyle(panel);
	return { background: skin.backgroundColor || "", edge: skin.boxShadow || "none" };
}

function wearPaint(panel, paint) {
	panel.style.backgroundColor = paint.background;
	panel.style.boxShadow = paint.edge;
}

function enterTransition() {
	return ["border-radius", "background-color", "box-shadow"]
		.map((name) => `${name} ${GROW_MS}ms var(--wg-ease)`)
		.join(", ");
}

function contentTransition() {
	return `opacity ${CONTENT_MS}ms var(--wg-ease) ${CONTENT_DELAY_MS}ms`;
}

function sitOnAnchor(panel, seat, paint, origin) {
	panel.style.transition = "none";
	panel.style.animation = "none";
	// CONTEXT: the exit folds into a corner of its own, so the growth's corner is written here
	panel.style.transformOrigin = origin;
	// CONTEXT: the keyframes read the seed off the element, because only JS has measured the trigger
	panel.style.setProperty("--wg-kit-pop-seed-x", `${seat.scaleX}`);
	panel.style.setProperty("--wg-kit-pop-seed-y", `${seat.scaleY}`);
	panel.style.scale = `${seat.scaleX} ${seat.scaleY}`;
	panel.style.borderRadius = seat.radius;
	wearPaint(panel, paint);
	const inner = panel.firstElementChild;
	if (!inner) return;
	inner.style.transition = "none";
	inner.style.opacity = "0";
}

function commitSeat(panel) {
	void getComputedStyle(panel).opacity;
}

function growPanel(panel, paint) {
	panel.style.transition = enterTransition();
	panel.style.animation = `wg-kit-pop-bloom ${GROW_MS}ms var(--wg-ease) both`;
	panel.style.scale = "";
	panel.style.borderRadius = "";
	wearPaint(panel, paint);
	const inner = panel.firstElementChild;
	if (!inner) return;
	inner.style.transition = contentTransition();
	inner.style.opacity = "1";
}

function landPanel(panel) {
	panel.style.transition = "";
	clearMotion(panel);
}

export function enterPanel(panel, anchor, placement) {
	clearMotion(panel);
	const placed = placePanel(panel, anchor.getBoundingClientRect(), placement);
	anchor.style.visibility = placement.hidesTrigger ? "hidden" : "";
	if (prefersReducedMotion()) return;
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

export function exitPanel(panel, anchor, done) {
	// CONTEXT: the enter's own curves are still armed, and the hold below must not play on one
	panel.style.transition = "none";
	// CONTEXT: `is-open` held the opacity and is already gone — the measurement below would commit 1 -> 0 untransitioned
	panel.style.opacity = "1";
	// CONTEXT: a half-run enter leaves a centred origin and a scale the fold's corner maths cannot see
	unstage(panel);
	// CONTEXT: the fold's scale is read off this box, so it is pinned before any measurement
	const held = panel.getBoundingClientRect();
	panel.style.width = `${held.width}px`;
	panel.style.height = `${held.height}px`;

	const inner = panel.firstElementChild;
	if (inner) {
		// TRADE-OFF: the fold's own duration — at 120ms the content blinked out ahead of the box
		inner.style.transition = "opacity var(--wg-quick) var(--wg-ease)";
		inner.style.opacity = "0";
	}
	panel.style.transition =
		"transform var(--wg-quick) var(--wg-ease), border-radius var(--wg-quick) var(--wg-ease), opacity var(--wg-press) var(--wg-ease) 80ms";
	panel.style.opacity = "0";
	fold(panel, anchor);

	const finish = (event?: TransitionEvent) => {
		if (event && (event.target !== panel || event.propertyName !== "transform")) return;
		stop();
		done();
	};
	const guard = setTimeout(() => finish(), EXIT_GUARD_MS);
	const stop = () => {
		clearTimeout(guard);
		panel.removeEventListener("transitionend", finish);
	};
	panel.addEventListener("transitionend", finish);
	return stop;
}
