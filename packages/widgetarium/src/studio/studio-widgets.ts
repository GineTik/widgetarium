import type { ImportedWidgets } from "@widgetarium/core/engine/module-registry.js";
import * as aiButton from "./widgets/ai-button/widget.js";
import * as band from "./widgets/band/widget.js";
import * as controlMenu from "./widgets/control-menu/widget.js";
import * as safeArea from "./widgets/safe-area/widget.js";

export const STUDIO_WIDGETS: ImportedWidgets = {
	"@studio/band": band,
	"@studio/control-menu": controlMenu,
	"@studio/ai-button": aiButton,
	"@studio/safe-area": safeArea,
};
