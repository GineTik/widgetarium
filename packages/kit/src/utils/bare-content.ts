export const FULL_STEP_SIDES = "data-full-step";

const NEVER_CONTENT = new Set(["STYLE", "SCRIPT", "TEMPLATE"]);

const DRAWN_WITHOUT_TEXT = "svg, img, canvas, video, input, button, textarea, select";

const SIDES = ["top", "right", "bottom", "left"] as const;

type Side = (typeof SIDES)[number];

type Frame = Readonly<Record<Side, number>>;

const PLATE = '[data-surface="group"]';

const FILLED_CONTROL = ".wg-kit-field, .wg-kit-input-group, .wg-kit-native-select, .wg-kit-quiz-input";

const STANDS_AS_A_PLATE = `${PLATE}, img, picture, ${FILLED_CONTROL}`;

const SHORTENS_THE_PLATE = `${PLATE}, :scope > img, :scope > picture`;

const TOUCH_PX = 1;

export interface FullStep {
	readonly node: Element;
	readonly sides: string;
}

export function fullStepsIn(plate: Element): FullStep[] {
	if (!plate.querySelector(SHORTENS_THE_PLATE)) return [];
	const style = getComputedStyle(plate);
	const shortened = SIDES.filter((side) => isShortenedAt(style, side));
	if (shortened.length === 0) return [];
	const frame = contentFrameOf(plate, style);
	return bareContentIn(plate).flatMap((node) => {
		const sides = shortened.filter((side) => touches(node, frame, side));
		return sides.length === 0 ? [] : [{ node, sides: sides.join(" ") }];
	});
}

function isShortenedAt(style: CSSStyleDeclaration, side: Side): boolean {
	const full = parseFloat(style.getPropertyValue("--wg-group-pad"));
	return parseFloat(style.getPropertyValue(`padding-${side}`)) < full;
}

function contentFrameOf(plate: Element, style: CSSStyleDeclaration): Frame {
	const rect = plate.getBoundingClientRect();
	const inset = (side: Side): number =>
		parseFloat(style.getPropertyValue(`padding-${side}`)) + parseFloat(style.getPropertyValue(`border-${side}-width`));
	return {
		top: rect.top + inset("top"),
		right: rect.right - inset("right"),
		bottom: rect.bottom - inset("bottom"),
		left: rect.left + inset("left"),
	};
}

function bareContentIn(holder: Element): Element[] {
	const children = [...holder.children].filter((child) => !holdsNothing(child));
	const platesKin = new Set(children.filter((child) => child.matches(PLATE)).map(slotOf));
	return children.flatMap((child) => {
		if (child.matches(STANDS_AS_A_PLATE) || platesKin.has(slotOf(child))) return [];
		return child.querySelector(PLATE) ? bareContentIn(child) : [child];
	});
}

function holdsNothing(node: Element): boolean {
	if (NEVER_CONTENT.has(node.tagName)) return true;
	return (
		(node.textContent ?? "").trim() === "" &&
		!node.matches(DRAWN_WITHOUT_TEXT) &&
		!node.querySelector(DRAWN_WITHOUT_TEXT)
	);
}

function slotOf(node: Element): string | null {
	return node.getAttribute("data-slot");
}

function touches(node: Element, frame: Frame, side: Side): boolean {
	const rect = node.getBoundingClientRect();
	const margin = parseFloat(getComputedStyle(node).getPropertyValue(`margin-${side}`));
	const outward = side === "top" || side === "left" ? rect[side] - frame[side] : frame[side] - rect[side];
	return outward - margin < TOUCH_PX;
}
