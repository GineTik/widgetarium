import { setIcon } from "obsidian";
import type { App, View } from "obsidian";
import type { BoxAction } from "@widgetarium/core/surface/box-actions.js";

export interface HeaderMount {
	readonly node: HTMLElement;
	readonly blockIndex?: number | undefined;
	actions?: readonly BoxAction[];
	actionsSignature?: string;
	isInHeader?: boolean;
}

export interface HeaderActionsAsk {
	readonly app: App;
	readonly mounts: () => Iterable<HeaderMount>;
	readonly editAction: () => BoxAction;
}

export interface HeaderActions {
	hold(mount: HeaderMount, actions: readonly BoxAction[]): void;
	sync(): void;
	clear(): void;
}

interface ActionView {
	readonly containerEl: HTMLElement;
	addAction(icon: string, title: string, callback: (event: MouseEvent) => unknown): HTMLElement;
}

interface PlacedAction {
	action: BoxAction;
	element?: HTMLElement;
}

type Placed = Map<string, PlacedAction>;

export function createHeaderActions({ app, mounts, editAction }: HeaderActionsAsk): HeaderActions {
	const placedByView = new Map<ActionView, Placed>();

	const wantedByView = (): Map<ActionView, BoxAction[]> => {
		const wanted = new Map<ActionView, BoxAction[]>();
		for (const mount of mounts()) {
			const view = mount.node.isConnected ? viewHolding(app, mount.node) : null;
			if (!view) continue;
			const actions = wanted.get(view) ?? [editAction()];
			const prefix = `${mount.blockIndex ?? 0}:`;
			actions.push(...(mount.actions ?? []).map((action) => ({ ...action, key: `${prefix}${action.key}` })));
			wanted.set(view, actions);
		}
		return wanted;
	};

	const sync = (): void => {
		const wanted = wantedByView();
		for (const [view, placed] of placedByView) {
			if (wanted.has(view)) continue;
			for (const held of placed.values()) held.element?.remove();
			placedByView.delete(view);
		}
		for (const [view, actions] of wanted) placeActions(placedByView, view, actions);
	};

	const hold = (mount: HeaderMount, actions: readonly BoxAction[]): void => {
		const signature = signatureOf(actions);
		mount.actions = actions;
		if (mount.actionsSignature === signature && mount.isInHeader === mount.node.isConnected) {
			refreshPresses(placedByView, mount, actions);
			return;
		}
		mount.actionsSignature = signature;
		mount.isInHeader = mount.node.isConnected;
		sync();
	};

	const clear = (): void => {
		for (const placed of placedByView.values()) for (const held of placed.values()) held.element?.remove();
		placedByView.clear();
	};

	return { hold, sync, clear };
}

function isActionView(view: View | null | undefined): view is View & ActionView {
	return typeof Reflect.get(view ?? {}, "addAction") === "function";
}

function viewHolding(app: App, node: HTMLElement): ActionView | null {
	let holder: ActionView | null = null;
	app.workspace.iterateAllLeaves((leaf) => {
		const { view } = leaf;
		if (holder || !isActionView(view)) return;
		if (view.containerEl?.contains(node)) holder = view;
	});
	return holder;
}

function signatureOf(actions: readonly BoxAction[]): string {
	return actions.map((action) => `${action.key}|${action.icon}|${action.title}|${Boolean(action.isOn)}`).join("\n");
}

function paint(element: HTMLElement, action: BoxAction): void {
	setIcon(element, action.icon ?? "");
	element.setAttribute("aria-label", action.title ?? "");
	element.classList.toggle("is-active", Boolean(action.isOn));
}

function placeActions(placedByView: Map<ActionView, Placed>, view: ActionView, actions: readonly BoxAction[]): void {
	const placed: Placed = placedByView.get(view) ?? new Map();
	const keys = new Set(actions.map((action) => action.key));
	for (const [key, held] of placed) {
		if (keys.has(key)) continue;
		held.element?.remove();
		placed.delete(key);
	}
	for (const action of [...actions].reverse()) {
		const held = placed.get(action.key) ?? { action };
		held.action = action;
		held.element ??= view.addAction(action.icon ?? "", action.title ?? "", (event) =>
			held.action.press({ x: event.clientX, y: event.clientY }),
		);
		paint(held.element, action);
		placed.set(action.key, held);
	}
	placedByView.set(view, placed);
}

function refreshPresses(
	placedByView: Map<ActionView, Placed>,
	mount: HeaderMount,
	actions: readonly BoxAction[],
): void {
	const prefix = `${mount.blockIndex ?? 0}:`;
	for (const placed of placedByView.values()) {
		for (const action of actions) {
			const held = placed.get(`${prefix}${action.key}`);
			if (held) held.action = { ...action, key: `${prefix}${action.key}` };
		}
	}
}
