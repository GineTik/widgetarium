import type { DataAdapter } from "obsidian";
import { boardIn } from "./board-in-note.js";
import type { Board } from "@widgetarium/core/model.js";
import { screenPathOf, vaultBindingOf } from "@widgetarium/core/app-design.js";
import type { ScreenState } from "@widgetarium/core/app-design.js";
import type { WidgetStates } from "@widgetarium/core/registry-scope.js";
import { statePropsOf } from "@widgetarium/studio";
import type { StatePicture } from "@widgetarium/studio";
import type { DrawnState } from "@widgetarium/core/engine/design-port.js";

export interface DrawnStateSource {
	readonly adapter: Pick<DataAdapter, "read">;
	readonly statesOf: (widget: string) => WidgetStates | undefined;
}

const NO_BOARD = "{name} holds no widgetarium board";
const BOUND_TO_VAULT =
	"{name} reads the vault ({binding}): a design is drawn from sample rows only. Ask the agent to redraw it.";

export async function readDrawnState(
	source: DrawnStateSource,
	app: string,
	state: ScreenState,
	screen: string,
): Promise<DrawnState> {
	const text = await source.adapter.read(screenPathOf(app, state.file)).catch(() => "");
	const board = boardIn(text);
	if (!board) return { name: state.name, board, refusal: NO_BOARD.replace("{name}", state.file) };
	const picture = pictureOf(source, board, state.name === screen ? null : state.name);
	if (picture) return { name: state.name, board, picture };
	const binding = vaultBindingOf(board);
	if (!binding) return { name: state.name, board };
	const refusal = BOUND_TO_VAULT.replace("{name}", state.file).replace("{binding}", binding);
	return { name: state.name, board: null, refusal };
}

function pictureOf(source: DrawnStateSource, board: Board, state: string | null): StatePicture | null {
	const [tile] = board.tiles;
	if (!tile || board.tiles.length > 1) return null;
	const props = statePropsOf(source.statesOf(tile.widget) ?? {}, state);
	return props ? { widget: tile.widget, props } : null;
}
