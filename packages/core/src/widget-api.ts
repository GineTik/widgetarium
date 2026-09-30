import { createElement as h, Component } from "react";
import type { ComponentType, ReactNode } from "react";
import { leaseFor } from "./engine/render.js";
import { crashBoundary } from "./crash-boundary.js";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
	DialogClose,
	ConfirmDialog,
} from "./dialog.js";
import { EditableTabs } from "./editable-tabs.js";
import { Mounted } from "./mounted.js";
import { rootWidget } from "./widget-root.js";
import { useData } from "./gateway/use-data";
import { useNarrowed } from "./gateway/use-narrowed";
import { useValue } from "./gateway/use-value";
import { defineProps, isDeclaredProps } from "./gateway/declared";
import type { DeclaredProps } from "./gateway/declared";
import type { Release } from "./gateway/host.js";
import { createDeclaredWidget } from "./declared-widget.js";
import type { DrawnProps, InjectedWidget } from "./declared-widget.js";
import { isObject } from "./engine/is-object.js";
import * as kitModule from "@widgetarium/kit";
import * as emojiModule from "@widgetarium/kit/emojis";

const NOT_A_WIDGET =
	"createWidget takes what the widget injects and the function that draws it: createWidget({ inject: { ... }, draw: (props) => ... })";

interface WidgetDeclaration {
	readonly inject?: unknown;
	readonly draw: (drawn: DrawnProps) => ReactNode;
}

const Boundary = crashBoundary(h, Component);

export function createWidget(widget: unknown): InjectedWidget {
	if (!isWidgetDeclaration(widget)) throw new Error(NOT_A_WIDGET);
	return createDeclaredWidget(injectedProps(widget.inject ?? {}), widget.draw);
}

export function drawWidget<Props extends object>(
	element: HTMLElement,
	component: ComponentType<Props>,
	props: Props,
): Release {
	const { draw, release } = leaseFor(element);
	draw(rootWidget(h(Boundary, null, h(component, props))));
	return release;
}

export const reactSurface = {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
	DialogClose,
	ConfirmDialog,
	EditableTabs,
	Mounted,
	createWidget,
	useData,
	useNarrowed,
	useValue,
};

export const kit = kitModule;
export const emojis = emojiModule;

// TRADE-OFF: an object is only claimed to hold props; defineProps refuses every entry that is not one
export function isPropsToDefine(held: unknown): held is DeclaredProps {
	return isObject(held);
}

function injectedProps(inject: unknown): DeclaredProps {
	if (isDeclaredProps(inject)) return inject;
	if (!isPropsToDefine(inject)) throw new Error(NOT_A_WIDGET);
	return defineProps(inject);
}

function isWidgetDeclaration(held: unknown): held is WidgetDeclaration {
	return isObject(held) && typeof held["draw"] === "function";
}
