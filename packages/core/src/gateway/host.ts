import type { ReactNode } from "react";
import type { VaultRecord } from "./needs";
import type { DropTarget } from "../tree-drop";

export interface HostConsole {
	can: { log: boolean; run: boolean };
	log(...parts: unknown[]): boolean;
	run(command: string): Promise<{ ok: boolean; output: string; failure: string | null }>;
}

export interface ViewHost {
	platform: string;
	type: string;
	can: { catalogue: boolean; fullscreen: boolean; subscribe: boolean; network: boolean; renderMarkdown: boolean };
	console: HostConsole;
	ui: {
		notify(said: string): void;
		renderMarkdown(element: HTMLElement, markdown: string, sourcePath?: string): () => void;
	};
}

export type NavigationTarget = "self" | "blank";

export interface Navigation {
	canNavigate: boolean;
	resolve(link: string): string | null;
	navigate(link: string, options?: { target?: NavigationTarget }): boolean;
}

export interface ReadAnswer {
	ok: boolean;
	text: string;
	path: string | null;
	bytes: number;
	failure: string | null;
}

export interface PassageReader {
	canRead: boolean;
	read(link: string, options?: { maxBytes?: number }): Promise<ReadAnswer>;
}

export interface PassageRecord {
	of: string;
	path: string;
	props: Record<string, unknown>;
	content: string | null;
}

export interface Here<T = VaultRecord> {
	of: string;
	content: string | null;
	canUpdate: boolean;
	get(): Promise<T | null>;
	update(content: string): Promise<boolean>;
}

export interface InlineContent {
	content: string | null;
}

export interface MountRow {
	name: string;
	widget?: string;
	hidden?: boolean;
	was?: string;
}

export type Release = () => void;

export interface MountEntry {
	name: string;
	id?: string;
	hidden: boolean;
	title: string;
	manifest: Record<string, unknown> | null;
	problem: "failed" | "not-found" | "empty" | null;
	failure: string | null;
	surface: "group" | "none" | null;
	height: number | null;
	drawInto: ((element: HTMLElement) => Release) | null;
}

export type ConfigureMounts = (name: string, rows: readonly MountRow[]) => void;

export interface WidgetCatalogue {
	canOpen: boolean;
	open(options?: { mode?: string; kind?: string }): Promise<string | null>;
}

export interface WidgetPreview {
	readonly canPreview: boolean;
	readonly Drawn: (props: { readonly widget: string }) => ReactNode;
}

export interface CarryPointer {
	readonly clientX: number;
	readonly clientY: number;
	readonly button: number;
	preventDefault(): void;
}

export interface CarriedWidget {
	readonly widget: string;
	readonly label: string;
}

export type PlaceAt =
	| { readonly kind: "board"; readonly board: string; readonly target: DropTarget }
	| { readonly kind: "note"; readonly note: string; readonly line: number };

export interface Carrier {
	readonly canCarry: boolean;
	lift(pointer: CarryPointer, carried: CarriedWidget): Promise<PlaceAt | null>;
}

export type FoldIntoGroup = () => boolean;

export type Slot<Given> =
	(((given: Given) => ReactNode) & { surface: "fill" | "outline" | "raise" | "none"; isCard: boolean }) | null;
