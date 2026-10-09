import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundleOf, THEMES } from "./harness.ts";
import { effectsBuiltByTailwind } from "./kit-layout-tailwind.ts";

export type Painted = readonly [name: string, got: unknown, want: unknown];

const HOST = `--font-interface: Helvetica, Arial, sans-serif; --font-monospace: Menlo, monospace;
	--font-ui-smaller: 12px; --font-ui-small: 14px; --font-ui-medium: 16px;`;

const SETTLE = "new Promise((done) => setTimeout(done, 700))";

const READY = `new Promise((done, fail) => {
	const started = Date.now();
	const poll = () => (window.ready === true ? done(true) : Date.now() - started > 15000 ? fail(new Error("the kit layout page never drew")) : setTimeout(poll, 50));
	poll();
})`;

const ASPECT = `(() => { const box = document.getElementById("aspect").getBoundingClientRect(); return [Math.round(box.width), Math.round(box.height)]; })()`;

const ACCORDION = `(async () => {
	const panels = () => [...document.querySelectorAll("#accordion [data-slot='accordion-content']")];
	const heights = () => panels().map((panel) => Math.round(panel.getBoundingClientRect().height));
	const before = heights();
	const shutInner = getComputedStyle(panels()[1].firstElementChild).visibility;
	document.querySelectorAll("#accordion [data-slot='accordion-trigger']")[1].click();
	await new Promise((done) => setTimeout(done, 90));
	const midway = heights()[1];
	await ${SETTLE};
	return { before, shutInner, isMidway: midway > 0 && midway < before[0], after: heights() };
})()`;

const SHARED_PLATE = `(() => {
	const left = (node) => Math.round(node.getBoundingClientRect().left);
	const plate = (id) => document.getElementById(id);
	const sharing = plate("sharing-plate");
	const rows = sharing.querySelector("[data-slot='accordion']");
	const alone = plate("alone-plate");
	return {
		sharingPad: getComputedStyle(sharing).padding,
		titleIn: left(sharing.querySelector(".title")) - left(sharing),
		noteIn: left(document.getElementById("sharing-note")) - left(sharing),
		rowsIn: left(rows) - left(sharing),
		rowTextIn: left(rows.querySelector(".wg-kit-row-label")) - left(sharing),
		rowsCorner: getComputedStyle(rows).borderTopLeftRadius,
		alonePad: getComputedStyle(alone).padding,
	};
})()`;

const FIELD = `(() => {
	const field = document.getElementById("form-field");
	const [label, control, message] = [...field.children];
	const box = (node) => node.getBoundingClientRect();
	const textLeft = (node) => Math.round(box(node).left + parseFloat(getComputedStyle(node).paddingLeft));
	return {
		labelToInput: Math.round(box(control).top - box(label).bottom),
		inputToMessage: Math.round(box(message).top - box(control).bottom),
		textStarts: [textLeft(label), textLeft(control), textLeft(message)].map((at) => at - Math.round(box(control).left)),
	};
})()`;

const SCROLL = `(async () => {
	const viewport = document.querySelector("#scroll [data-slot='scroll-area-viewport']");
	const thumb = document.querySelector("#scroll [data-slot='scroll-area-thumb']");
	const progress = (name) => viewport.getAnimations().find((each) => each.animationName === name)?.effect.getComputedTiming().progress;
	const frame = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
	const top = [progress("wg-kit-fade-start"), progress("wg-kit-fade-end")];
	const mask = getComputedStyle(viewport).maskImage;
	viewport.scrollTop = 300;
	await frame();
	const middle = [progress("wg-kit-fade-start"), progress("wg-kit-fade-end")];
	const offset = new DOMMatrix(getComputedStyle(thumb).transform).m42;
	viewport.scrollTop = 100000;
	await frame();
	const bottom = [progress("wg-kit-fade-start"), progress("wg-kit-fade-end")];
	return { top, middle, bottom, isMask: mask.includes("linear-gradient"), thumb: [Math.round(thumb.getBoundingClientRect().width), Math.round(thumb.getBoundingClientRect().height)], offset: Math.round(offset) };
})()`;

const SHIMMER = `(async () => {
	const style = getComputedStyle(document.getElementById("shimmer"));
	const first = style.backgroundPosition;
	await new Promise((done) => setTimeout(done, 300));
	return { name: style.animationName, fill: style.webkitTextFillColor, clip: style.backgroundClip, moves: getComputedStyle(document.getElementById("shimmer")).backgroundPosition !== first };
})()`;

const SWEEPS = `(() => {
	const sweepOf = (id) => document.getAnimations().find((each) => each.effect.target.id === id);
	const movedBy = (animation) => Object.keys(animation.effect.getKeyframes().at(-1)).filter((key) => !["offset", "easing", "composite", "computedOffset"].includes(key));
	const bone = sweepOf("skeleton");
	const text = sweepOf("shimmer");
	return { bone: [bone.animationName, bone.effect.pseudoElement, movedBy(bone)], text: [text.animationName, movedBy(text)] };
})()`;

const CAROUSEL = `(async () => {
	Element.prototype.setPointerCapture = () => {};
	const viewport = document.querySelector("#carousel [data-slot='carousel-content']");
	const slideAt = (index) => document.querySelectorAll("#carousel [data-slot='carousel-item'] > div")[index];
	const isShown = (index) => Math.abs(slideAt(index).getBoundingClientRect().left - viewport.getBoundingClientRect().left) < 2;
	const prevWas = document.getElementById("prev").disabled;
	document.getElementById("next").click();
	await ${SETTLE};
	const afterNext = [isShown(1), document.getElementById("prev").disabled];
	const at = (x) => ({ clientX: x, clientY: 40, pointerId: 1, pointerType: "mouse", button: 0, bubbles: true });
	viewport.dispatchEvent(new PointerEvent("pointerdown", at(250)));
	viewport.dispatchEvent(new PointerEvent("pointermove", at(200)));
	viewport.dispatchEvent(new PointerEvent("pointermove", at(150)));
	viewport.dispatchEvent(new PointerEvent("pointerup", at(150)));
	await ${SETTLE};
	return { prevWas, afterNext, draggedTo: isShown(2) };
})()`;

const RESIZE = `(async () => {
	const handle = document.getElementById("handle");
	const share = () => {
		const left = document.getElementById("left").getBoundingClientRect().width;
		const right = document.getElementById("right").getBoundingClientRect().width;
		return Math.round((left * 100) / (left + right));
	};
	const before = share();
	const box = handle.getBoundingClientRect();
	const at = (x) => ({ clientX: x, clientY: box.top + 10, pointerId: 1, pointerType: "mouse", button: 0, bubbles: true });
	handle.dispatchEvent(new PointerEvent("pointerdown", at(box.left)));
	handle.dispatchEvent(new PointerEvent("pointermove", at(box.left + 64)));
	handle.dispatchEvent(new PointerEvent("pointerup", at(box.left + 64)));
	await ${SETTLE};
	const dragged = share();
	handle.dispatchEvent(new PointerEvent("pointerdown", at(box.left)));
	handle.dispatchEvent(new PointerEvent("pointermove", at(box.left - 300)));
	handle.dispatchEvent(new PointerEvent("pointerup", at(box.left - 300)));
	await ${SETTLE};
	return { before, dragged, floored: share() };
})()`;

const TAILWIND = `(() => {
	const holder = document.getElementById("tailwind");
	holder.innerHTML = '<p id="tw-text" class="shimmer no-scrollbar">Thinking</p><div id="tw-scroll" class="scroll-fade" style="height:60px;overflow:auto"><div style="height:400px"></div></div>';
	const text = getComputedStyle(document.getElementById("tw-text"));
	const scroller = getComputedStyle(document.getElementById("tw-scroll"));
	return { shimmer: text.animationName, fill: text.webkitTextFillColor, noBar: text.scrollbarWidth, mask: scroller.maskImage.includes("linear-gradient") };
})()`;

const STEPS = `(() => {
	const inset = (plate, inner) => {
		const outer = plate.getBoundingClientRect();
		const box = inner.getBoundingClientRect();
		return { left: Math.round(box.left - outer.left), top: Math.round(box.top - outer.top), right: Math.round(outer.right - box.right), bottom: Math.round(outer.bottom - box.bottom) };
	};
	const titleAt = (id) => {
		const plate = document.getElementById(id);
		const { left, top } = inset(plate, plate.querySelector(".title"));
		return [left, top];
	};
	const inner = inset(document.getElementById("holding-plate"), document.getElementById("inner-plate"));
	return { bare: titleAt("bare-plate"), holding: titleAt("holding-plate"), inner: [inner.left, inner.right, inner.bottom] };
})()`;

function pageHtml(script: string, tailwindCss: string): string {
	return `<!doctype html><html><head><meta charset="utf-8">
<style>${readFileSync("apps/obsidian/styles.css", "utf8")}</style>
<style>${tailwindCss}</style>
<style>:root { ${THEMES.light} ${HOST} } body { margin: 0; padding: 20px; }</style>
</head><body class="wg-root theme-light"><div id="host"></div><script>${script}</script></body></html>`;
}

async function openPage(tailwindCss: string): Promise<AskedPage> {
	const file = path.join(mkdtempSync(path.join(tmpdir(), "wg-kit-layout-")), "page.html");
	writeFileSync(file, pageHtml(await bundleOf("tools/kit-layout-page.tsx"), tailwindCss));
	const page = await paged(file, "kit layout paint", { size: [400, 1400] });
	await page.ask(READY);
	return page;
}

function compiledChecks(css: string): Painted[] {
	return [
		[
			"THE THEME'S shimmer UTILITY COMPILES THROUGH THE REAL TAILWIND",
			/\.shimmer\s*\{/.test(css) && css.includes("@keyframes tw-shimmer"),
			true,
		],
		[
			"and scroll-fade with its registered properties",
			/\.scroll-fade\s*\{/.test(css) && css.includes("@property --scroll-fade-t"),
			true,
		],
		[
			"and scroll-fade-x, no-scrollbar and shadcn's data-open variant",
			[/\.scroll-fade-x\s*\{/.test(css), /\.no-scrollbar\s*\{/.test(css), css.includes('[data-state="open"]')],
			[true, true, true],
		],
	];
}

export async function paintChecks(): Promise<Painted[]> {
	const css = await effectsBuiltByTailwind();
	const page = await openPage(css);
	try {
		return [
			...compiledChecks(css),
			["AN ASPECT RATIO 16/9 IS 180 TALL AT 320 WIDE, IN CHROME", await page.ask(ASPECT), [320, 180]],
			...accordionPainted(await page.ask(ACCORDION)),
			...sharedPlatePainted(await page.ask(SHARED_PLATE)),
			...fieldPainted(await page.ask(FIELD)),
			...scrollPainted(await page.ask(SCROLL)),
			[
				"THE KIT'S SHIMMER RUNS: CLIPPED TO TEXT, MOVING",
				await page.ask(SHIMMER),
				{ name: "wg-kit-shimmer", fill: "rgba(0, 0, 0, 0)", clip: "text", moves: true },
			],
			[
				"THE SKELETON'S BONE SWEEPS BY TRANSFORM AND THE SHIMMER BY BACKGROUND, EACH UNDER ITS OWN KEYFRAMES",
				await page.ask(SWEEPS),
				{
					bone: ["wg-kit-skeleton-sweep", "::after", ["transform"]],
					text: ["wg-kit-shimmer", ["backgroundPositionX", "backgroundPositionY"]],
				},
			],
			[
				"A CAROUSEL STEPS BY ITS BUTTON AND BY A MOUSE DRAG, IN CHROME",
				await page.ask(CAROUSEL),
				{ prevWas: true, afterNext: [true, false], draggedTo: true },
			],
			[
				"A RESIZABLE HANDLE DRAGGED 64PX OF 320 MOVES 20%, AND STOPS AT THE MINIMUM",
				await page.ask(RESIZE),
				{ before: 50, dragged: 70, floored: 20 },
			],
			...stepsPainted(await page.ask(STEPS)),
			[
				"TAILWIND'S shimmer AND scroll-fade PAINT IN CHROME",
				await page.ask(TAILWIND),
				{ shimmer: "tw-shimmer", fill: "rgba(0, 0, 0, 0)", noBar: "none", mask: true },
			],
		];
	} finally {
		page.close();
	}
}

function accordionPainted(seen: unknown): Painted[] {
	return [
		[
			"AN ACCORDION'S HEIGHT ANIMATES OPEN AND SHUT, IN CHROME",
			seen,
			{ before: [136, 0], shutInner: "hidden", isMidway: true, after: [0, 136] },
		],
	];
}

function sharedPlatePainted(seen: unknown): Painted[] {
	return [
		[
			"ROWS SHARING A CARD TAKE NONE OF ITS PADDING: TITLE AND NOTE KEEP THE FULL INSET, THE ROWS ARE THEIR OWN ROUNDED SHAPE WITH TEXT ON THE TITLE'S LINE; ROWS ALONE STILL TAKE EVERY EDGE",
			seen,
			{
				sharingPad: "16px",
				titleIn: 16,
				noteIn: 16,
				rowsIn: 8,
				rowTextIn: 16,
				rowsCorner: "8px",
				alonePad: "0px",
			},
		],
	];
}

function fieldPainted(seen: unknown): Painted[] {
	return [
		[
			"A FIELD'S MESSAGE STANDS CLOSER TO ITS INPUT THAN ITS LABEL, AND BOTH START WHERE THE INPUT'S TEXT STARTS",
			seen,
			{ labelToInput: 8, inputToMessage: 4, textStarts: [16, 16, 16] },
		],
	];
}

function stepsPainted(seen: unknown): Painted[] {
	return [
		[
			"A TITLE ON A PLATE THAT HOLDS A PLATE STANDS AT THE FULL STEP, LIKE ONE ON A PLATE THAT HOLDS NONE; THE INNER PLATE AT THE SHORT STEP ON THE SIDES AND THE BOTTOM IT TOUCHES",
			seen,
			{ bare: [16, 16], holding: [16, 16], inner: [8, 8, 8] },
		],
	];
}

function scrollPainted(seen: unknown): Painted[] {
	return [
		[
			"A FADED SCROLL AREA FADES ONLY THE EDGES THAT HIDE ROWS, DRIVEN BY ITS SCROLL; ITS THUMB TRACKS",
			seen,
			{ top: [0, 0], middle: [1, 0], bottom: [1, 1], isMask: true, thumb: [6, 33], offset: 50 },
		],
	];
}
