import type { ImportedWidgets } from "@widgetarium/core/engine/module-registry.js";
import * as chipGroup from "./widgets/chip-group/widget.js";
import * as docPage from "./widgets/doc-page/widget.js";
import * as facetList from "./widgets/facet-list/widget.js";
import * as filterBar from "./widgets/filter-bar/widget.js";
import * as head from "./widgets/head/widget.js";
import * as search from "./widgets/search/widget.js";
import * as sheetDone from "./widgets/sheet-done/widget.js";
import * as sheetHead from "./widgets/sheet-head/widget.js";
import * as templateList from "./widgets/template-list/widget.js";
import * as viewSwitch from "./widgets/view-switch/widget.js";
import * as widgetList from "./widgets/widget-list/widget.js";

export const CATALOGUE_WIDGETS: ImportedWidgets = {
	"@catalogue/chip-group": chipGroup,
	"@catalogue/doc-page": docPage,
	"@catalogue/facet-list": facetList,
	"@catalogue/filter-bar": filterBar,
	"@catalogue/head": head,
	"@catalogue/search": search,
	"@catalogue/sheet-done": sheetDone,
	"@catalogue/sheet-head": sheetHead,
	"@catalogue/template-list": templateList,
	"@catalogue/view-switch": viewSwitch,
	"@catalogue/widget-list": widgetList,
};
