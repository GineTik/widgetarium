import { ROOT } from "../paths.js";
import HANDBOOK_README from "../../docs/ai/README.md";
import HANDBOOK_BOARD from "../../docs/ai/board.md";
import HANDBOOK_SCREEN from "../../docs/ai/screen.md";
import HANDBOOK_WIDGET from "../../docs/ai/widget.md";
import HANDBOOK_CATALOGUE from "../../docs/ai/catalogue.md";
import HANDBOOK_COMPONENTS from "../../docs/ai/components.md";
import HANDBOOK_DESIGN from "../../docs/ai/design.md";
import PATTERNS_README from "../../docs/patterns/README.md";
import PATTERNS_COMPOSITION from "../../docs/patterns/composition.md";
import PATTERN_SIDEBAR from "../../docs/patterns/sidebar-and-content.md";
import PATTERN_NESTED_SIDEBARS from "../../docs/patterns/nested-sidebars.md";
import PATTERN_LIST_DETAIL from "../../docs/patterns/list-detail.md";
import PATTERN_THREE_PANE from "../../docs/patterns/three-pane.md";
import PATTERN_SUPPORTING_PANE from "../../docs/patterns/supporting-pane.md";
import PATTERN_VIEW_SWITCHER from "../../docs/patterns/view-switcher.md";
import PATTERN_TOOLBAR_CANVAS from "../../docs/patterns/toolbar-and-canvas.md";
import PATTERN_FULL_BLEED from "../../docs/patterns/full-bleed.md";
import PATTERN_COMMAND_PALETTE from "../../docs/patterns/command-palette.md";
import PATTERN_DRAWER from "../../docs/patterns/drawer.md";
import PATTERN_DASHBOARD_GRID from "../../docs/patterns/dashboard-grid.md";
import PATTERN_FEED from "../../docs/patterns/feed.md";
import PATTERN_DATA_TABLE from "../../docs/patterns/data-table.md";
import PATTERN_BOARD from "../../docs/patterns/board.md";
import PATTERN_CALENDAR from "../../docs/patterns/calendar.md";
import PATTERN_MATRIX from "../../docs/patterns/matrix.md";
import PATTERN_METRIC_TILE from "../../docs/patterns/metric-tile.md";
import PATTERN_DETAIL_REVEAL from "../../docs/patterns/detail-reveal.md";
import PATTERN_WIZARD from "../../docs/patterns/wizard.md";
import PATTERN_EMPTY_STATE from "../../docs/patterns/empty-state.md";
import PATTERN_SEARCH_FIRST from "../../docs/patterns/search-first.md";
import PATTERN_GALLERY from "../../docs/patterns/gallery.md";
import PATTERN_SMALL_MULTIPLES from "../../docs/patterns/small-multiples.md";
import WIDGETS_CLI from "widgetarium:widgets-cli";

export const HANDBOOK_DIR = `${ROOT}/agent`;
export const PATTERNS_DIR = `${HANDBOOK_DIR}/patterns`;
export const BIN_DIR = `${ROOT}/bin`;
export const TOOL_PATH = `${BIN_DIR}/widgets.mjs`;

const HANDBOOK = {
	"README.md": HANDBOOK_README,
	"board.md": HANDBOOK_BOARD,
	"screen.md": HANDBOOK_SCREEN,
	"widget.md": HANDBOOK_WIDGET,
	"catalogue.md": HANDBOOK_CATALOGUE,
	"components.md": HANDBOOK_COMPONENTS,
	"design.md": HANDBOOK_DESIGN,
};

export const PATTERNS = {
	"README.md": PATTERNS_README,
	"composition.md": PATTERNS_COMPOSITION,
	"sidebar-and-content.md": PATTERN_SIDEBAR,
	"nested-sidebars.md": PATTERN_NESTED_SIDEBARS,
	"list-detail.md": PATTERN_LIST_DETAIL,
	"three-pane.md": PATTERN_THREE_PANE,
	"supporting-pane.md": PATTERN_SUPPORTING_PANE,
	"view-switcher.md": PATTERN_VIEW_SWITCHER,
	"toolbar-and-canvas.md": PATTERN_TOOLBAR_CANVAS,
	"full-bleed.md": PATTERN_FULL_BLEED,
	"command-palette.md": PATTERN_COMMAND_PALETTE,
	"drawer.md": PATTERN_DRAWER,
	"dashboard-grid.md": PATTERN_DASHBOARD_GRID,
	"feed.md": PATTERN_FEED,
	"data-table.md": PATTERN_DATA_TABLE,
	"board.md": PATTERN_BOARD,
	"calendar.md": PATTERN_CALENDAR,
	"matrix.md": PATTERN_MATRIX,
	"metric-tile.md": PATTERN_METRIC_TILE,
	"detail-reveal.md": PATTERN_DETAIL_REVEAL,
	"wizard.md": PATTERN_WIZARD,
	"empty-state.md": PATTERN_EMPTY_STATE,
	"search-first.md": PATTERN_SEARCH_FIRST,
	"gallery.md": PATTERN_GALLERY,
	"small-multiples.md": PATTERN_SMALL_MULTIPLES,
};

async function writeIfChanged(adapter, path, text) {
	if ((await adapter.exists(path)) && (await adapter.read(path)) === text) return false;
	await adapter.write(path, text);
	return true;
}

export async function layAgentFiles(adapter) {
	const written = [];
	for (const folder of [HANDBOOK_DIR, PATTERNS_DIR, BIN_DIR]) {
		if (!(await adapter.exists(folder))) await adapter.mkdir(folder);
	}
	for (const [name, text] of Object.entries(HANDBOOK)) {
		if (await writeIfChanged(adapter, `${HANDBOOK_DIR}/${name}`, text)) written.push(name);
	}
	for (const [name, text] of Object.entries(PATTERNS)) {
		if (await writeIfChanged(adapter, `${PATTERNS_DIR}/${name}`, text)) written.push(`patterns/${name}`);
	}
	if (await writeIfChanged(adapter, TOOL_PATH, WIDGETS_CLI)) written.push("widgets.mjs");
	return written;
}
