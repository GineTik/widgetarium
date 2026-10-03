import { createElement as h } from "react";
import type { ReactNode } from "react";
import { viewHost } from "./engine/view-host.js";
import { reactClash } from "./fit.js";
import type { ReactIdentity } from "./fit.js";
import { slotDefaults } from "./gateway/props.js";
import { slotSurfaceOf } from "./surface-roles.js";
import { isPainted } from "./tree.js";
import { withSlotSurface } from "./widget-root.js";
import type { SlotDraw } from "./widget-root.js";
import { spanToPixels } from "./paths.js";
import { NO_HOST } from "./engine/host-none.js";
import type { HostClaimingNothing } from "./engine/host-none.js";
import { NO_CARRIER, NO_CATALOGUE, NO_PREVIEW } from "./engine/catalogue-none.js";
import { refuseRead } from "./engine/read-file.js";
import type { Fields } from "./engine/catalogue-index.js";
import { isObject } from "./engine/is-object.js";
import type { Here, Navigation, PassageReader, PassageRecord, ViewHost, WidgetCatalogue } from "./gateway/host.js";
import type { GivenProps } from "./declared-widget.js";
import type { WidgetComponent } from "./registry-scope.js";
import { declaredPropsIn, previewGateways } from "./preview-gateways.js";

export { previewGateways };
export type { PreviewGateways } from "./preview-gateways.js";

export interface PreviewSpan {
	readonly w: number;
	readonly h: number;
	readonly width: number;
	readonly height: number;
}

interface PreviewDefinition {
	readonly manifest?: Fields | null | undefined;
	readonly react?: ReactIdentity | null | undefined;
}

interface PreviewChild {
	readonly manifest?: Fields | null | undefined;
	readonly component?: WidgetComponent | undefined;
	readonly error?: unknown;
	readonly react?: ReactIdentity | null | undefined;
}

export interface PreviewRegistry {
	get(id: string | null | undefined): PreviewChild | null;
}

interface PreviewOptions {
	readonly registry?: PreviewRegistry | null | undefined;
	readonly host?: ViewHost | null | undefined;
}

type PreviewHost = ViewHost | HostClaimingNothing;

export interface PreviewProps {
	readonly [prop: string]: unknown;
	readonly here: Here<PassageRecord>;
	readonly navigator: Navigation;
	readonly reader: PassageReader;
	readonly content: unknown;
	readonly host: PreviewHost;
	readonly catalogue: WidgetCatalogue;
	readonly slots: Readonly<Record<string, SlotDraw<GivenProps> | null>>;
}

const DEFAULT_SPAN = { w: 4, h: 3 };

export const previewNavigator: Navigation = {
	canNavigate: false,
	resolve: () => null,
	navigate: () => {
		console.warn("Widgetarium: a preview cannot navigate — it is a picture of a widget, not the widget");
		return false;
	},
};

export function previewHere(content: unknown = null): Here<PassageRecord> {
	const of = content === null ? "entry" : "passage";
	const passage = content === null ? null : String(content);
	return {
		of,
		content: passage,
		canUpdate: false,
		get: async () => ({ of, path: "preview.md", props: {}, content: passage }),
		update: refuse("write what it is standing in"),
	};
}

export function previewReader(manifest: Fields | null | undefined): PassageReader {
	const preview = manifest?.["preview"];
	const files = isObject(preview) ? preview["files"] : null;
	const declared = isObject(files) ? files : {};
	return {
		canRead: true,
		async read(link) {
			const named = String(link ?? "").trim();
			const text = declared[named];
			if (text === undefined) return refuseRead(`${named || "that file"} is not in this preview`);
			const said = String(text);
			return { ok: true, text: said, path: named, bytes: said.length, failure: null };
		},
	};
}

// TRADE-OFF: the real environment when there is one — a catalogue tile that cannot render
// TRADE-OFF: markdown draws a widget nobody could judge
export function previewHost(host: ViewHost | null | undefined): PreviewHost {
	return host ? viewHost(host) : NO_HOST;
}

export function previewSize(manifest: Fields | null | undefined, cell: number, gap: number): PreviewSpan {
	const { w, h: tall } = spanIn(previewOf(manifest)["size"] ?? manifest?.["defaultSize"]) ?? DEFAULT_SPAN;
	return { w, h: tall, width: spanToPixels(w, cell, gap), height: spanToPixels(tall, cell, gap) };
}

export function previewProps(definition: PreviewDefinition | null | undefined, options?: PreviewOptions): PreviewProps {
	const manifest = definition?.manifest ?? {};
	const preview = previewOf(manifest);
	const size = isObject(preview["size"]) ? preview["size"] : {};
	const content = manifest["inline"] ? (preview["content"] ?? manifest["title"] ?? "Sample text") : null;

	return {
		...previewGateways(manifest),
		here: previewHere(content),
		navigator: previewNavigator,
		reader: previewReader(manifest),
		content,
		size: {
			w: size["w"] ?? DEFAULT_SPAN.w,
			h: size["h"] ?? DEFAULT_SPAN.h,
			scale: 1,
			isCollapsed: false,
			collapse() {},
			expand() {},
		},
		fullscreen: { isFullscreen: false, canFullscreen: false, open() {}, close() {}, toggle() {} },
		host: previewHost(options?.host),
		catalogue: NO_CATALOGUE,
		widgetPreview: NO_PREVIEW,
		widgetCarrier: NO_CARRIER,
		foldIntoGroup: () => false,
		slots: previewSlots(definition, options),
		mounts: {},
	};
}

function previewSlots(
	definition: PreviewDefinition | null | undefined,
	options: PreviewOptions | undefined,
): Record<string, SlotDraw<GivenProps> | null> {
	const slots: Record<string, SlotDraw<GivenProps> | null> = {};
	const declared = definition?.manifest?.["slots"];
	for (const [name, spec] of Object.entries(isObject(declared) ? declared : {})) {
		const held = isObject(spec) ? spec : {};
		const wanted = held["default"];
		const child = options?.registry?.get(typeof wanted === "string" ? wanted : null) ?? null;
		const component = child?.component;
		const isDrawable = component && !child.error && !reactClash(definition?.react, child.react);
		const surface = slotSurfaceOf(held, null);
		slots[name] = isDrawable
			? withSlotSurface(slotDraw(component, child, options), { surface, isCard: isPainted({ surface }) })
			: null;
	}
	return slots;
}

function slotDraw(
	component: WidgetComponent,
	child: PreviewChild,
	options: PreviewOptions | undefined,
): SlotDraw<GivenProps> {
	const unfed = slotDefaults(
		{ id: child.manifest?.["id"], props: Object.fromEntries(declaredPropsIn(child.manifest)) },
		null,
	);
	return (given): ReactNode =>
		h(component, {
			...unfed,
			...given,
			size: { w: 1, h: 1, scale: 1 },
			host: previewHost(options?.host),
			here: previewHere(),
			navigator: previewNavigator,
		});
}

function previewOf(manifest: Fields | null | undefined): Fields {
	const preview = manifest?.["preview"];
	return isObject(preview) ? preview : {};
}

function spanIn(size: unknown): { readonly w: number; readonly h: number } | null {
	if (size === null || size === undefined) return null;
	const held = isObject(size) ? size : {};
	return { w: Number(held["w"]), h: Number(held["h"]) };
}

function refuse(what: string): () => Promise<boolean> {
	return () => {
		console.warn(`Widgetarium: a preview cannot ${what} — it is a picture of a widget, not the widget`);
		return Promise.resolve(false);
	};
}
