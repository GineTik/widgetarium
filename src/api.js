import { Dialog } from "./dialog.js";
import { useAction } from "./action.js";

// the seam where the host will later wrap the view (provider, error boundary, settings shell);
// for now it only carries optional metadata for widgets used outside a vault
function createWidget(component, meta) {
	if (meta) component.meta = meta;
	return component;
}

export const widgetarium = { Dialog, useAction, createWidget };
