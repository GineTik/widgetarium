import { createElement as h } from "react";
import { DialogOverlay } from "../dialog.js";
import { cellLayer, panHandlers, wheelHandler } from "./canvas-input.js";
import { header, panel, zoomBar } from "./window-chrome.js";

export function settingsDialog(state, geometry, options, closing, closeOne) {
	const { frame, manifest } = geometry;
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
				style: {
					inset: `${frame.inset}px`,
					"--wg-cell": `${options.cell}px`,
					"--wg-gap": `${options.gap}px`,
				},
			},
			canvasParts(state, geometry, options, closing),
		),
	);
}

function initialOf(name) {
	return (
		String(name ?? "?")
			.replace(/^@[\w-]+\//, "")
			.trim()
			.charAt(0)
			.toUpperCase() || "?"
	);
}

function canvasParts(state, geometry, options, closing) {
	const { windowBox, at, scale, live, canvas, showingChip, manifest } = geometry;
	const canvasStyle = { left: `${at.x}px`, top: `${at.y}px`, width: `${canvas.width}px`, height: `${canvas.height}px` };
	const bodyStyle = {
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
