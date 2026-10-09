import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundleOf, THEMES } from "./harness.ts";

export type Twin = readonly [name: string, got: unknown, want: unknown];

const HOST = `--font-interface: Helvetica, Arial, sans-serif; --font-ui-smaller: 12px; --font-ui-small: 14px; --font-ui-medium: 16px;`;

const READY = `new Promise((done, fail) => {
	const started = Date.now();
	const poll = () => (window.ready === true ? done(true) : Date.now() - started > 15000 ? fail(new Error("the twins page never drew")) : setTimeout(poll, 50));
	poll();
})`;

const LOOK = `const lookOf = (element) => {
	if (!element) return "missing";
	const own = getComputedStyle(element);
	const plate = getComputedStyle(element, "::before");
	const box = element.getBoundingClientRect();
	return [Math.round(box.width), Math.round(box.height), own.padding, own.fontSize, own.fontWeight, plate.borderRadius, plate.backgroundColor, plate.boxShadow];
};
const byId = (id) => document.getElementById(id);
const corners = (element) => { const plate = getComputedStyle(element, "::before"); return [plate.borderTopLeftRadius, plate.borderTopRightRadius]; };`;

const RADIO = `(() => { ${LOOK}
	const markOf = (element) => { const look = lookOf(element); return [look[0], look[1], look[5], look[6], look[7]]; };
	return {
		checkedIsTheCheckbox: JSON.stringify(lookOf(byId("radio-on"))) === JSON.stringify(lookOf(byId("checkbox"))),
		uncheckedIsTheCheckbox: JSON.stringify(lookOf(byId("radio-off"))) === JSON.stringify(lookOf(byId("checkbox-off"))),
		quizMarkIsTheCheckbox: JSON.stringify(markOf(document.querySelector(".wg-kit-quiz-choice-mark"))) === JSON.stringify(markOf(byId("radio-off"))),
	};
})()`;

const MENU = `(() => { ${LOOK}
	const item = byId("menu-item");
	const strip = (look) => look.slice(1, 6);
	return {
		itemIsThePopoverItem: JSON.stringify(strip(lookOf(item))) === JSON.stringify(strip(lookOf(byId("popover-item")))),
		separator: byId("menu-separator").className,
	};
})()`;

const SLIDER = `(() => {
	const drawingOf = (selector) => {
		const svg = document.querySelector(selector + " svg");
		const cursor = svg.querySelector(".wg-kit-bar-cursor");
		const track = svg.querySelector(".wg-kit-bar-track");
		const active = svg.querySelector(".wg-kit-bar-active");
		return [svg.getAttribute("height"), cursor.getAttribute("width"), cursor.getAttribute("rx"), getComputedStyle(track).strokeWidth, getComputedStyle(track).stroke, getComputedStyle(active).stroke, getComputedStyle(cursor).fill];
	};
	return {
		sliderIsTheProgressSlider: JSON.stringify(drawingOf("#slider")) === JSON.stringify(drawingOf("#progress-slider")),
		rangeCursors: document.querySelectorAll("#range .wg-kit-bar-cursor").length,
		rangeThumbs: document.querySelectorAll("#range [role='slider']").length,
	};
})()`;

const QUIZ = `(() => {
	const svg = document.querySelector("#quiz-progress .wg-kit-bar svg");
	const plain = document.querySelector("#plain-bar svg");
	return { drawsTheProgressBar: Boolean(svg) && svg.getAttribute("height") === plain.getAttribute("height"), ownTrack: document.querySelectorAll(".wg-kit-quiz-progress-fill").length };
})()`;

const NAV_SPOT = `(() => { const box = document.getElementById("nav-trigger").getBoundingClientRect(); return [box.left + box.width / 2, box.top + box.height / 2]; })()`;

const NAV = `(() => { ${LOOK}
	const viewport = document.querySelector(".wg-kit-nav-viewport");
	const nav = byId("nav").getBoundingClientRect();
	const strip = (look) => look.slice(1, 6);
	return {
		trigger: byId("nav-trigger").dataset.state,
		placedUnderTheMenu: Boolean(viewport) && Math.abs(viewport.getBoundingClientRect().top - nav.bottom) <= 16,
		linkIsTheTrigger: JSON.stringify(strip(lookOf(byId("nav-link")))) === JSON.stringify(strip(lookOf(byId("nav-trigger")))),
		contentLinkIsThePopoverItem: byId("nav-content-link")?.classList.contains("wg-kit-pop-item") ?? false,
	};
})()`;

const TOGGLES = `(() => { ${LOOK}
	const [bold, italic, , strike] = document.querySelectorAll("#toggles button");
	return {
		boldEnd: corners(bold)[1],
		italicStart: corners(italic)[0],
		italicEnd: corners(italic)[1],
		loneStrike: corners(strike),
		pressedToggleIsTheAccentButton: JSON.stringify(lookOf(byId("toggle-on"))) === JSON.stringify(lookOf(byId("button-accent"))),
	};
})()`;

const JOINED = `(() => { ${LOOK}
	const [archive, report] = document.querySelectorAll("#buttons > .wg-kit-btn");
	const field = document.querySelector("#joined-input > .wg-kit-field");
	const [first, second] = document.querySelectorAll(".wg-kit-otp-slot");
	const fieldOf = (element) => { const style = getComputedStyle(element); return [Math.round(element.getBoundingClientRect().height), style.backgroundColor]; };
	return {
		archiveEnd: corners(archive)[1],
		reportStart: corners(report)[0],
		outlineEdge: getComputedStyle(archive, "::before").boxShadow,
		fieldStart: getComputedStyle(field).borderTopLeftRadius,
		otpJoin: [getComputedStyle(first).borderTopRightRadius, getComputedStyle(second).borderTopLeftRadius],
		otpIsTheField: JSON.stringify(fieldOf(first)) === JSON.stringify(fieldOf(document.querySelector(".wg-kit-field:has(#input)"))),
	};
})()`;

function pageHtml(script: string): string {
	return `<!doctype html><html><head><meta charset="utf-8">
<style>${readFileSync("apps/obsidian/styles.css", "utf8")}</style>
<style>:root { ${THEMES.light} ${HOST} } body { margin: 0; padding: 20px; }</style>
</head><body class="wg-root theme-light"><div id="host"></div><script>${script}</script></body></html>`;
}

async function openPage(): Promise<AskedPage> {
	const file = path.join(mkdtempSync(path.join(tmpdir(), "wg-twins-")), "page.html");
	writeFileSync(file, pageHtml(await bundleOf("tools/twins-paint-page.tsx")));
	const page = await paged(file, "twins paint", { size: [600, 1600] });
	await page.ask(READY);
	await waited(600);
	return page;
}

const TOGGLE_MOTION = `(async () => {
	const [, italic, underline] = document.querySelectorAll("#toggles button");
	const endOf = () => parseFloat(getComputedStyle(italic, "::before").borderTopRightRadius);
	const before = endOf();
	underline.click();
	await new Promise((done) => setTimeout(done, 90));
	const midway = endOf();
	await new Promise((done) => setTimeout(done, 700));
	const after = endOf();
	underline.click();
	await new Promise((done) => setTimeout(done, 700));
	return { before, isMidway: midway > after && midway < before, after };
})()`;

async function navOpenedByRestThenPress(page: AskedPage): Promise<unknown> {
	const [x, y] = (await page.ask(NAV_SPOT)) as [number, number];
	await page.hover(x - 2, y);
	await waited(500);
	await page.press(x, y);
	await waited(500);
	return page.ask(NAV);
}

async function answerOf(page: AskedPage, expression: string): Promise<unknown> {
	try {
		return await page.ask(expression);
	} catch (error) {
		return String(error).slice(0, 300);
	}
}

export async function twinChecks(): Promise<readonly Twin[]> {
	const page = await openPage();
	try {
		return [
			[
				"A RADIO IS OUR CHECKBOX, ROUND: same box, fill, edge and press, checked and not, and the questionnaire's mark is the same",
				await answerOf(page, RADIO),
				{ checkedIsTheCheckbox: true, uncheckedIsTheCheckbox: true, quizMarkIsTheCheckbox: true },
			],
			[
				"A MENU ITEM IS OUR POPOVER ITEM: height, padding, type and corner, and its separator is the popover's",
				await answerOf(page, MENU),
				{ itemIsThePopoverItem: true, separator: "wg-kit-pop-sep" },
			],
			[
				"A SLIDER IS OUR PROGRESS SLIDER: the same drawing, cursor and track; a range draws two cursors on two thumbs",
				await answerOf(page, SLIDER),
				{ sliderIsTheProgressSlider: true, rangeCursors: 2, rangeThumbs: 2 },
			],
			[
				"THE QUESTIONNAIRE'S PROGRESS IS OUR PROGRESS BAR, with no track of its own",
				await answerOf(page, QUIZ),
				{ drawsTheProgressBar: true, ownTrack: 0 },
			],
			[
				"A NAVIGATION TRIGGER OPENS ON A PRESS AFTER THE POINTER RESTED ON IT, UNDER THE MENU; THE LINK BESIDE IT IS THE TRIGGER'S LOOK",
				await navOpenedByRestThenPress(page),
				{ trigger: "open", placedUnderTheMenu: true, linkIsTheTrigger: true, contentLinkIsThePopoverItem: true },
			],
			[
				"PRESSED TOGGLES SIDE BY SIDE JOIN WITH SMALL CORNERS WHERE THEY TOUCH; A LONE ONE KEEPS THE FULL ROUND; A PRESSED TOGGLE IS THE ACCENT BUTTON",
				await answerOf(page, TOGGLES),
				{
					boldEnd: "6px",
					italicStart: "6px",
					italicEnd: "26px",
					loneStrike: ["26px", "26px"],
					pressedToggleIsTheAccentButton: true,
				},
			],
			[
				"TURNING ON THE TOGGLE BETWEEN TWO PRESSED ONES SHRINKS THE TOUCHING CORNERS OVER TIME, NOT AT ONCE",
				await answerOf(page, TOGGLE_MOTION),
				{ before: 26, isMidway: true, after: 6 },
			],
			[
				"JOINED CONTROLS MEET ON THE SMALL CORNER WITH NO LINE BETWEEN, A FIELD INCLUDED; AN OTP SLOT IS OUR FIELD",
				await answerOf(page, JOINED),
				{
					archiveEnd: "6px",
					reportStart: "6px",
					outlineEdge: "none",
					fieldStart: "6px",
					otpJoin: ["6px", "6px"],
					otpIsTheField: true,
				},
			],
		];
	} finally {
		page.close();
	}
}
