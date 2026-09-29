import { createElement as h } from "react";

export const ZOOM_STEP = 0.1;

export const ZOOM_FLOOR = 0.25;

const ZOOM_PER_WHEEL_UNIT = 0.003;

// TRADE-OFF: a trackpad reports small deltas and the canvas is large, so panning 1:1 with the fingers crawls — the canvas travels twice as far as they do
const PAN_PER_WHEEL_UNIT = 2;

const TAP_SLOP_PX = 4;

export function clamp(value, low, high) {
	return Math.max(low, Math.min(value, high));
}

export function cellLayer(box, at, scale, cell, gap) {
	const pitch = cell + gap;
	const step = pitch * scale;
	const left = at.x - Math.ceil(Math.max(0, at.x) / step) * step;
	const top = at.y - Math.ceil(Math.max(0, at.y) / step) * step;
	const across = Math.max(1, Math.ceil((box.width - left) / step));
	const down = Math.max(1, Math.ceil((box.height - top) / step));
	const held = [];
	for (let index = 0; index < across * down; index += 1) held.push(h("i", { key: index }));
	return h(
		"div",
		{
			className: "wg-set-cells",
			key: "cells",
			style: {
				left: `${left}px`,
				top: `${top}px`,
				width: `${across * pitch - gap}px`,
				transform: `scale(${scale})`,
				"--wg-set-across": across,
			},
		},
		held,
	);
}

// TRADE-OFF: a wheel over the widget pans the canvas instead of scrolling the widget. At 1:1 the widget is the thing being looked at, not used; the chrome is exempt so its lists still scroll.
export function wheelHandler(state) {
	return (event) => {
		if (event.target?.closest?.(".wg-set-chrome")) return;
		event.preventDefault();

		const rect = event.currentTarget.getBoundingClientRect();
		const pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };

		if (!(event.ctrlKey || event.metaKey)) {
			state.setLook({
				pan: {
					x: state.at.x - event.deltaX * PAN_PER_WHEEL_UNIT,
					y: state.at.y - event.deltaY * PAN_PER_WHEEL_UNIT,
				},
			});
			return;
		}

		const wanted = clamp(state.scale * Math.exp(-event.deltaY * ZOOM_PER_WHEEL_UNIT), ZOOM_FLOOR, 1);
		if (wanted === state.scale) return;
		const ratio = wanted / state.scale;
		state.setLook({
			zoom: wanted,
			pan: { x: pointer.x - (pointer.x - state.at.x) * ratio, y: pointer.y - (pointer.y - state.at.y) * ratio },
		});
	};
}

export function panHandlers(state) {
	return {
		onPointerDown: (event) => {
			const rect = event.currentTarget.getBoundingClientRect();
			const start = { x: event.clientX, y: event.clientY };
			const from = { ...state.at };
			let moved = false;
			const move = (pointer) => {
				const dx = pointer.clientX - start.x;
				const dy = pointer.clientY - start.y;
				if (Math.abs(dx) > TAP_SLOP_PX || Math.abs(dy) > TAP_SLOP_PX) moved = true;
				if (moved) state.setPan({ x: from.x + dx, y: from.y + dy });
			};
			const stop = (pointer) => {
				window.removeEventListener("pointermove", move);
				window.removeEventListener("pointerup", stop);
				if (moved || state.live) return;
				const px = pointer.clientX - rect.left;
				const py = pointer.clientY - rect.top;
				state.setPan({ x: px - (px - from.x) / state.scale, y: py - (py - from.y) / state.scale });
				state.setZoom(1);
			};
			window.addEventListener("pointermove", move);
			window.addEventListener("pointerup", stop);
		},
	};
}
