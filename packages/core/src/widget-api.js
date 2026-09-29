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
import { AppearanceOverride, rootWidget, useBackgroundType, useWidgetRounded, WidgetRoot } from "./widget-root.js";
import { useData } from "./gateway/use-data";
import { useNarrowed } from "./gateway/use-narrowed";
import { useValue } from "./gateway/use-value";
import { defineProps, isDeclaredProps } from "./gateway/declared";
import { createDeclaredWidget } from "./declared-widget.js";
import * as kitModule from "@widgetarium/kit";
import * as emojiModule from "@widgetarium/kit/emojis";

const NOT_A_WIDGET =
	"createWidget takes what the widget injects and the function that draws it: createWidget({ inject: { ... }, draw: (props) => ... })";

export function createWidget(widget) {
	if (typeof widget?.draw !== "function") throw new Error(NOT_A_WIDGET);
	const inject = widget.inject ?? {};
	return createDeclaredWidget(isDeclaredProps(inject) ? inject : defineProps(inject), widget.draw);
}

const Boundary = crashBoundary(h, Component);

export function drawWidget(element, component, props) {
	const { draw, release } = leaseFor(element);
	draw(rootWidget(h(Boundary, null, h(component, props))));
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
