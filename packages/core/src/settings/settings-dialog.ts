import { createElement as h } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { DialogOverlay } from "../dialog.js";
import type { WindowGeometry } from "./window-geometry.js";
import type { WindowState } from "../settings-window.js";
import { cellLayer, panHandlers, wheelHandler } from "./canvas-input.js";
import { header, panel, zoomBar } from "./window-chrome.js";

interface DialogOptions {
	readonly cell: number;
	readonly gap: number;
	readonly widget: ReactNode;
}

type WindowStyle = CSSProperties & Readonly<Record<"--wg-cell" | "--wg-gap", string>>;

export function settingsDialog(
	state: WindowState,
	geometry: WindowGeometry,
	options: DialogOptions,
	closing: boolean,
	closeOne: () => void,
): ReactElement {
	const { frame, manifest } = geometry;
	const style: WindowStyle = {
		inset: `${frame.inset}px`,
		"--wg-cell": `${options.cell}px`,
		"--wg-gap": `${options.gap}px`,
	};
	return h(
		DialogOverlay,
		{ key: "settings-window", className: `wg-set-over${closing ? " is-leaving" : ""}`, onClose: closeOne },
		h(
			"div",
			{
				className: `wg-set-window${closing ? " is-leaving" : ""}`,
				role: "dialog",
				"aria-modal": "true",
				"aria-label": `${manifest.title ?? manifest.id} settings`,
				tabIndex: -1,
				onWheel: wheelHandler(state),
				style,
			},
			canvasParts(state, geometry, options, closing),
		),
	);
}

function initialOf(name: string | undefined): string {
	return (
		String(name ?? "?")
			.replace(/^@[\w-]+\//, "")
			.trim()
			.charAt(0)
			.toUpperCase() || "?"
	);
}

function canvasParts(
	state: WindowState,
	geometry: WindowGeometry,
	options: DialogOptions,
	closing: boolean,
): ReactNode[] {
	const { windowBox, at, scale, live, canvas, showingChip, manifest } = geometry;
	const canvasStyle: CSSProperties = {
		left: `${at.x}px`,
		top: `${at.y}px`,
		width: `${canvas.width}px`,
		height: `${canvas.height}px`,
	};
	const bodyStyle: CSSProperties = {
		...canvasStyle,
		position: "absolute",
		transform: live ? "none" : `scale(${scale})`,
		transformOrigin: "top left",
		visibility: showingChip ? "hidden" : "visible",
	};
	return [
		cellLayer(windowBox, at, scale, options.cell, options.gap),
		h("div", { className: "wg-set-pan", key: "pan", ...panHandlers(state) }),
		h("div", { className: `wg-set-body${live ? " is-live" : ""}`, key: "body", style: bodyStyle }, options.widget),
		showingChip
			? h(
					"div",
					{ className: "wg-set-chip", key: "chip", style: canvasStyle },
					h("div", { className: "wg-narrow" }, [
						h("span", { className: "wg-narrow-mark" }, initialOf(manifest.title ?? manifest.id)),
						h("span", { className: "wg-narrow-open" }, "Narrow"),
					]),
				)
			: null,
		live ? null : h("div", { className: "wg-set-look", key: "look", ...panHandlers(state) }),
		h("div", { className: `wg-set-chrome${closing ? " is-leaving" : ""}`, key: "chrome" }, [
			header(state),
			panel(state),
			zoomBar(state),
		]),
	];
}
