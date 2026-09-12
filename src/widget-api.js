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
import { WidgetRoot, AppearanceOverride, useWidgetRounded, useBackgroundType } from "./widget-root.js";
import { useData } from "./gateway/use-data";
import { useNarrowed } from "./gateway/use-narrowed";
import { useValue } from "./gateway/use-value";
import * as kitModule from "./kit.js";
import * as emojiModule from "./emojis.js";

function createWidget(component, meta) {
	if (meta) component.meta = meta;
	return component;
}

const Boundary = crashBoundary(h, Component);

export function drawWidget(element, component, props) {
	const { draw, release } = leaseFor(element);
	draw(h(Boundary, null, h(component, props)));
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
