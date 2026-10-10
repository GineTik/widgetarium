import type { ImportedWidgets } from "@widgetarium/core/engine/module-registry.js";
import * as band from "./widgets/band/widget.js";
import * as controlMenu from "./widgets/control-menu/widget.js";
import * as panelButton from "./widgets/panel-button/widget.js";
import * as safeArea from "./widgets/safe-area/widget.js";

export const STUDIO_WIDGETS: ImportedWidgets = {
	"@studio/band": band,
	"@studio/control-menu": controlMenu,
	"@studio/panel-button": panelButton,
	"@studio/safe-area": safeArea,
};
