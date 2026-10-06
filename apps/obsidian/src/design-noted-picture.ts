import { createElement as h, useLayoutEffect, useRef, useState } from "react";
import type { ReactElement, RefObject } from "react";
import type { ReferenceNote } from "@widgetarium/core/app-design.js";
import type { DrawnReference } from "./design-canvas-shapes.js";

const TONE_SAID: Readonly<Record<ReferenceNote["tone"], string>> = {
	take: "Take",
	like: "Like",
	dislike: "Leave",
	note: "Note",
};

interface Line {
	readonly from: readonly [number, number];
	readonly to: readonly [number, number];
	readonly tone: ReferenceNote["tone"];
}

export function NotedPicture({ reference }: { readonly reference: DrawnReference }): ReactElement {
	const body = useRef<HTMLDivElement | null>(null);
	const lines = useLinesIn(body, reference.notes);
	const left = reference.notes.filter((note) => (note.at?.[0] ?? 1) < 0.5);
	const right = reference.notes.filter((note) => (note.at?.[0] ?? 1) >= 0.5);
	return h("div", { className: "wg-design-noted", ref: body }, [
		h("div", { key: "left", className: "wg-design-notes is-left" }, left.map(noteOf)),
		h("img", { key: "img", src: reference.src, alt: reference.why ?? reference.name, draggable: false }),
		h("div", { key: "right", className: "wg-design-notes is-right" }, right.map(noteOf)),
		h("svg", { key: "lines", className: "wg-design-note-lines", "aria-hidden": true }, lines.map(lineDrawnOf)),
	]);
}

function noteOf(note: ReferenceNote, at: number): ReactElement {
	return h(
		"div",
		{ key: at, className: `wg-design-note is-${note.tone}`, "data-at": note.at ? note.at.join(",") : undefined },
		[h("b", { key: "tone" }, TONE_SAID[note.tone]), h("span", { key: "text" }, note.text)],
	);
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

function useLinesIn(body: RefObject<HTMLDivElement | null>, notes: readonly ReferenceNote[]): readonly Line[] {
	const [lines, setLines] = useState<readonly Line[]>([]);
	useLayoutEffect(() => {
		const held = body.current;
		if (!held) return;
		const measure = (): void => setLines(linesIn(held));
		const watcher = new ResizeObserver(measure);
		watcher.observe(held);
		measure();
		return () => watcher.disconnect();
	}, [body, notes]);
	return lines;
}

function linesIn(body: HTMLDivElement): Line[] {
	const picture = body.querySelector("img");
	if (!picture) return [];
	return [...body.querySelectorAll<HTMLElement>(".wg-design-note[data-at]")].flatMap((note) =>
		linesFrom(note, picture),
	);
}

function linesFrom(note: HTMLElement, picture: HTMLImageElement): Line[] {
	const column = note.parentElement;
	if (!column) return [];
	const [x = 0, y = 0] = (note.dataset["at"] ?? "").split(",").map(Number);
	const to: [number, number] = [
		picture.offsetLeft + x * picture.offsetWidth,
		picture.offsetTop + y * picture.offsetHeight,
	];
	return [{ from: noteEdgeOf(note, column), to, tone: toneOf(note) }];
}

function noteEdgeOf(note: HTMLElement, column: HTMLElement): [number, number] {
	const isLeft = column.classList.contains("is-left");
	return [note.offsetLeft + (isLeft ? note.offsetWidth : 0), note.offsetTop + note.offsetHeight / 2];
}

function toneOf(note: HTMLElement): ReferenceNote["tone"] {
	const found = (["take", "like", "dislike"] as const).find((tone) => note.classList.contains(`is-${tone}`));
	return found ?? "note";
}
