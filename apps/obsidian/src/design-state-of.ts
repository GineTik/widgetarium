import { boardIn } from "./board-in-note.js";
import type { Board } from "@widgetarium/core/model.js";
import { screenPathOf, vaultBindingOf } from "@widgetarium/core/app-design.js";
import type { ScreenState } from "@widgetarium/core/app-design.js";
import { statePropsOf } from "./design-state-drawing.js";
import type { DrawnState, StatePicture } from "./design-canvas-shapes.js";
import type WidgetariumPlugin from "./main.js";

const NO_BOARD = "{name} holds no widgetarium board";
const BOUND_TO_VAULT =
	"{name} reads the vault ({binding}): a design is drawn from sample rows only. Ask the agent to redraw it.";

export async function stateOf(
	plugin: WidgetariumPlugin,
	app: string,
	state: ScreenState,
	screen: string,
): Promise<DrawnState> {
	const text = await plugin.app.vault.adapter.read(screenPathOf(app, state.file)).catch(() => "");
	const board = boardIn(text);
	if (!board) return { name: state.name, board, refusal: NO_BOARD.replace("{name}", state.file) };
	const picture = pictureOf(plugin, board, state.name === screen ? null : state.name);
	if (picture) return { name: state.name, board, picture };
	const binding = vaultBindingOf(board);
	if (!binding) return { name: state.name, board };
	const refusal = BOUND_TO_VAULT.replace("{name}", state.file).replace("{binding}", binding);
	return { name: state.name, board: null, refusal };
}

function pictureOf(plugin: WidgetariumPlugin, board: Board, state: string | null): StatePicture | null {
	const [tile] = board.tiles;
	if (!tile || board.tiles.length > 1) return null;
	const props = statePropsOf(plugin.registry.get(tile.widget)?.states ?? {}, state);
	return props ? { widget: tile.widget, props } : null;
}
