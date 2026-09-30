import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { DialogClose } from "../dialog.js";
import type { WindowState } from "../settings-window.js";
import { Button, Icon, IconButton, Pill, Segmented, Sidebar, SidebarSheet } from "@widgetarium/kit";
import { ZOOM_FLOOR, ZOOM_STEP, clamp } from "./canvas-input.js";
import { dataGroups } from "./data-groups.js";
import { designGroups } from "./design-groups.js";
import { mountGroups } from "./mount-groups.js";
import { propGroup } from "./prop-row.js";
import { slotGroup } from "./slot-group.js";

export function header(state: WindowState): ReactElement {
	return h("div", { className: `wg-set-head wg-kit-glass${state.phone ? " is-sheet" : ""}`, key: "head" }, [
		h("span", { className: "wg-set-crumbs", key: "crumbs" }, crumbTrail(state)),
		h("span", { className: "wg-set-head-right", key: "right" }, [
			state.crumbs.length > 1 ? null : h(Pill, { key: "size" }, `${state.place.w} × ${state.place.h}`),
			// TRADE-OFF: both, and they do the same thing — every edit is already written, so Done is what a person looks for and the cross is what they reach for by habit
			h(Button, { size: "s", variant: "accent", key: "done", onClick: () => state.onDone() }, "Done"),
			h(DialogClose, { key: "close", onClose: () => state.onDismiss(), label: "Close without keeping the changes" }),
		]),
	]);
}

export function zoomBar(state: WindowState): ReactElement {
	const percent = `${Math.round(state.scale * 100)}%`;
	const said = state.opening.panned && state.zoom === null ? `${percent} · panned to the top left` : percent;
	return h(
		"div",
		{
			className: `wg-set-bar wg-kit-glass${state.barHidden ? " is-hidden" : ""}`,
			key: "bar",
			style: state.barStyle ?? undefined,
		},
		[
			h(
				"button",
				{
					type: "button",
					key: "fit",
					"aria-pressed": String(state.zoom === null),
					onClick: () => state.setLook({ zoom: null }),
				},
				"Fit",
			),
			h(
				"button",
				{ type: "button", key: "one", "aria-pressed": String(state.live), onClick: () => state.setZoom(1) },
				"1:1",
			),
			h("span", { className: "wg-set-div", key: "d1" }),
			h(
				"button",
				{
					type: "button",
					key: "out",
					"aria-label": "Zoom out",
					onClick: () => state.setZoom(clamp(state.scale - ZOOM_STEP, ZOOM_FLOOR, 1)),
				},
				"-",
			),
			h(
				"button",
				{
					type: "button",
					key: "in",
					"aria-label": "Zoom in",
					onClick: () => state.setZoom(clamp(state.scale + ZOOM_STEP, ZOOM_FLOOR, 1)),
				},
				"+",
			),
			h("span", { className: "wg-set-said", key: "said" }, said),
			state.canNarrow ? h("span", { className: "wg-set-div", key: "d2" }) : null,
			state.canNarrow
				? h(
						"button",
						{
							type: "button",
							key: "narrow",
							"aria-pressed": String(state.narrow),
							onClick: () => state.setNarrow(!state.narrow),
						},
						"Narrow",
					)
				: null,
			h("span", { className: "wg-set-div", key: "d3" }),
			h(
				"button",
				{
					type: "button",
					key: "fold",
					"aria-pressed": String(state.folded),
					"aria-label": "Fold the settings away",
					onClick: () => state.setFolded(!state.folded),
				},
				h(Icon, { name: state.folded ? "fold" : "chevron" }),
			),
		],
	);
}

export function panel(state: WindowState): ReactElement {
	if (state.folded) {
		return h(
			IconButton,
			{
				key: "panel",
				className: "wg-set-fold wg-kit-glass",
				label: "Bring the settings back",
				style: state.panelStyle,
				onClick: () => state.setFolded(false),
			},
			h(Icon, { name: "fold" }),
		);
	}
	const inside = [
		h(Segmented, {
			key: "tabs",
			className: "wg-set-tabs",
			items: state.tabs,
			value: state.tab,
			onChange: state.setTab,
		}),
		h("div", { className: "wg-set-scroll", key: "scroll" }, panelBody(state)),
		h("div", { className: "wg-set-foot", key: "foot" }, h("code", null, state.manifest.id)),
	];

	if (state.phone) {
		return h(
			SidebarSheet,
			{
				as: "aside",
				key: "panel",
				surface: "glass",
				className: "wg-set-panel is-sheet",
				style: state.panelStyle,
				isOpen: state.sheetFull,
				onOpen: state.setSheetFull,
				// TODO: pass CHROME.sheetPeekPx — the sheet peeks at the kit's 220px, the canvas reserves 168px
				maxPx: state.sheetMaxPx,
				onHeight: state.setSheetHeight,
			},
			inside,
		);
	}

	return h(
		Sidebar,
		{ as: "aside", surface: "glass", className: "wg-set-panel", key: "panel", style: state.panelStyle },
		inside,
	);
}

function panelBody(state: WindowState): ReactNode[] {
	if (state.tab === "data") return dataGroups(state);
	if (state.tab === "design") return designGroups(state);
	return [propGroup(state), slotGroup(state), ...mountGroups(state)];
}

function crumbTrail(state: WindowState): ReactElement[] {
	const last = state.crumbs.length - 1;
	return state.crumbs.flatMap((crumb, depth): ReactElement[] =>
		depth === last
			? [h("span", { className: "wg-set-here", key: depth }, crumb)]
			: [
					h(
						"button",
						{ type: "button", className: "wg-set-crumb", key: depth, onClick: () => state.popTo(depth) },
						crumb,
					),
					h("span", { className: "wg-set-crumb-sep", key: `sep${depth}`, "aria-hidden": "true" }, "\u203a"),
				],
	);
}
