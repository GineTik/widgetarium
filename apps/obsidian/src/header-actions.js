import { setIcon } from "obsidian";

function viewHolding(app, node) {
	let holder = null;
	app.workspace.iterateAllLeaves((leaf) => {
		if (holder || typeof leaf.view?.addAction !== "function") return;
		if (leaf.view.containerEl?.contains(node)) holder = leaf.view;
	});
	return holder;
}

const signatureOf = (actions) =>
	actions.map((action) => `${action.key}|${action.icon}|${action.title}|${Boolean(action.isOn)}`).join("\n");

function paint(element, action) {
	setIcon(element, action.icon);
	element.setAttribute("aria-label", action.title);
	element.classList.toggle("is-active", Boolean(action.isOn));
}

export function createHeaderActions({ app, mounts, editAction }) {
	const placedByView = new Map();

	const wantedByView = () => {
		const wanted = new Map();
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

	const place = (view, actions) => {
		const placed = placedByView.get(view) ?? new Map();
		const keys = new Set(actions.map((action) => action.key));
		for (const [key, held] of placed) {
			if (keys.has(key)) continue;
			held.element.remove();
			placed.delete(key);
		}
		for (const action of [...actions].reverse()) {
			const held = placed.get(action.key) ?? { action };
			held.action = action;
			held.element ??= view.addAction(action.icon, action.title, (event) =>
				held.action.press({ x: event.clientX, y: event.clientY }),
			);
			paint(held.element, action);
			placed.set(action.key, held);
		}
		placedByView.set(view, placed);
	};

	const sync = () => {
		const wanted = wantedByView();
		for (const [view, placed] of placedByView) {
			if (wanted.has(view)) continue;
			for (const held of placed.values()) held.element.remove();
			placedByView.delete(view);
		}
		for (const [view, actions] of wanted) place(view, actions);
	};

	const hold = (mount, actions) => {
		const signature = signatureOf(actions);
		mount.actions = actions;
		if (mount.actionsSignature === signature && mount.isInHeader === mount.node.isConnected)
			return refreshPresses(mount);
		mount.actionsSignature = signature;
		mount.isInHeader = mount.node.isConnected;
		sync();
	};

	const refreshPresses = (mount) => {
		const prefix = `${mount.blockIndex ?? 0}:`;
		for (const placed of placedByView.values()) {
			for (const action of mount.actions) {
				const held = placed.get(`${prefix}${action.key}`);
				if (held) held.action = { ...action, key: `${prefix}${action.key}` };
			}
		}
	};

	const clear = () => {
		for (const placed of placedByView.values()) for (const held of placed.values()) held.element.remove();
		placedByView.clear();
	};

	return { hold, sync, clear };
}
