import { createElement as h, Component } from "react";
import { leaseFor } from "./engine/render.js";
import { crashBoundary } from "./crash-boundary.js";
import {
	Dialog,
	DialogOverlay,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
	DialogClose,
	ConfirmDialog,
} from "./dialog.js";
import { useAction } from "./action.js";
import { EditableTabs, toTabList } from "./editable-tabs.js";
import { Mounted } from "./mounted.js";
import { AppearanceOverride, rootedWidget, useBackgroundType, useWidgetRounded, WidgetRoot } from "./widget-root.js";
import { useData } from "./gateway/use-data";
import { useNarrowed } from "./gateway/use-narrowed";
import { useValue } from "./gateway/use-value";
import * as kitModule from "./kit.js";
import * as emojiModule from "./emojis.js";

// TODO: drop the (component, meta) form once every shipped widget declares defineManifest
function createWidget(first, second) {
	if (typeof first === "function") {
		if (second) first.meta = second;
		return first;
	}
	second.manifest = first;
	return second;
}

const Boundary = crashBoundary(h, Component);

export function drawWidget(element, component, props) {
	const { draw, release } = leaseFor(element);
	draw(rootedWidget(h(Boundary, null, h(component, props))));
	return release;
}

export const reactSurface = {
	Dialog,
	DialogOverlay,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
	DialogClose,
	ConfirmDialog,
	Mounted,
	WidgetRoot,
	AppearanceOverride,
	useWidgetRounded,
	useBackgroundType,
	useAction,
	createWidget,
	useData,
	useNarrowed,
	useValue,
	EditableTabs,
	toTabList,
	Kit: kitModule.Kit,
};

export const kit = kitModule;
export const emojis = emojiModule;
