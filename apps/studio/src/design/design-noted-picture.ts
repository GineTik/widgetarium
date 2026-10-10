import { createElement as h, useLayoutEffect, useRef, useState } from "react";
import type { ReactElement, RefObject } from "react";
import type { ReferenceNote } from "@widgetarium/core/app-design.js";
import type { DrawnReference } from "./design-canvas-shapes.js";
import { placedNotes } from "./note-layout.js";
import type { NoteSide, PlacedNote } from "./note-layout.js";

const OPEN_WIDGET = "{name} ↗";
const TONE_SAID: Readonly<Record<ReferenceNote["tone"], string>> = {
	take: "Take",
	like: "Like",
	dislike: "Leave",
	note: "Note",
};
const NOTE_GAP_PX = 16;
const SIDES: readonly NoteSide[] = ["left", "right"];

interface Line {
	readonly from: readonly [number, number];
	readonly to: readonly [number, number];
	readonly tone: ReferenceNote["tone"];
}

interface Laid {
	readonly placed: readonly PlacedNote[];
	readonly lines: readonly Line[];
	readonly height: number;
}

export interface WidgetOpener {
	readonly open: (widget: string) => void;
	readonly nameOf: (widget: string) => string;
}

export function NotedPicture({
	reference,
	opener,
}: {
	readonly reference: DrawnReference;
	readonly opener: WidgetOpener;
}): ReactElement {
	const body = useRef<HTMLDivElement | null>(null);
	const laid = useLaidNotes(body, reference.notes);
	const columnOf = (side: NoteSide): ReactElement =>
		h(
			"div",
			{ key: side, className: `wg-design-notes is-${side}`, style: { height: `${laid?.height ?? 0}px` } },
			reference.notes.map((note, at) => noteOf(note, at, laid?.placed[at], side, opener)),
		);
	return h("div", { className: "wg-design-noted", ref: body }, [
		columnOf("left"),
		h("img", { key: "img", src: reference.src, alt: reference.why ?? reference.name, draggable: false }),
		columnOf("right"),
		h("svg", { key: "lines", className: "wg-design-note-lines", "aria-hidden": true }, laid?.lines.map(lineDrawnOf)),
	]);
}

function noteOf(
	note: ReferenceNote,
	at: number,
	place: PlacedNote | undefined,
	side: NoteSide,
	opener: WidgetOpener,
): ReactElement | null {
	const isHere = place ? place.side === side : side === "right";
	if (!isHere) return null;
	const style = place ? { top: `${place.top}px` } : { visibility: "hidden" as const };
	return h("div", { key: at, className: `wg-design-note is-${note.tone}`, "data-note": at, style }, [
		h("b", { key: "tone" }, TONE_SAID[note.tone]),
		h("span", { key: "text" }, note.text),
		note.into ? widgetButtonOf(note.into, opener) : null,
	]);
}

function lineDrawnOf(line: Line, at: number): ReactElement {
	return h("line", {
		key: at,
		className: `is-${line.tone}`,
		x1: line.from[0],
		y1: line.from[1],
		x2: line.to[0],
		y2: line.to[1],
	});
}

function useLaidNotes(body: RefObject<HTMLDivElement | null>, notes: readonly ReferenceNote[]): Laid | null {
	const [laid, setLaid] = useState<Laid | null>(null);
	useLayoutEffect(() => {
		const held = body.current;
		if (!held) return;
		const measure = (): void => setLaid(laidIn(held, notes));
		const watcher = new ResizeObserver(measure);
		watcher.observe(held);
		measure();
		return () => watcher.disconnect();
	}, [body, notes]);
	return laid;
}

function laidIn(body: HTMLDivElement, notes: readonly ReferenceNote[]): Laid | null {
	const picture = body.querySelector("img");
	const columns = SIDES.map((side) => body.querySelector<HTMLElement>(`.wg-design-notes.is-${side}`));
	if (!picture || picture.offsetHeight === 0) return null;
	const heights = notes.map((_, at) => body.querySelector<HTMLElement>(`[data-note="${at}"]`)?.offsetHeight ?? 0);
	const placed = placedNotes(
		notes.map((note, at) => ({ at: note.at, height: heights[at] ?? 0 })),
		picture.offsetHeight,
		NOTE_GAP_PX,
	);
	const lines = notes.flatMap((note, at) => lineOf(note, placed[at], heights[at] ?? 0, { picture, columns }));
	const bottom = Math.max(picture.offsetHeight, ...placed.map((place, at) => place.top + (heights[at] ?? 0)));
	return { placed, lines, height: bottom };
}

function lineOf(
	note: ReferenceNote,
	place: PlacedNote | undefined,
	height: number,
	{ picture, columns }: { readonly picture: HTMLImageElement; readonly columns: readonly (HTMLElement | null)[] },
): Line[] {
	const column = columns[place?.side === "left" ? 0 : 1];
	if (!note.at || !place || !column) return [];
	const edge = place.side === "left" ? column.offsetLeft + column.offsetWidth : column.offsetLeft;
	const from: [number, number] = [edge, column.offsetTop + place.top + height / 2];
	const to: [number, number] = [
		picture.offsetLeft + note.at[0] * picture.offsetWidth,
		picture.offsetTop + note.at[1] * picture.offsetHeight,
	];
	return [{ from, to, tone: note.tone }];
}

function widgetButtonOf(widget: string, opener: WidgetOpener): ReactElement {
	return h(
		"button",
		{ key: "into", type: "button", className: "wg-design-note-widget", onClick: () => opener.open(widget) },
		OPEN_WIDGET.replace("{name}", opener.nameOf(widget)),
	);
}
