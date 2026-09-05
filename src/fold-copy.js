const FOLD_LABEL = {
	left: { open: "Widgetarium: hide the left sidebar", folded: "Widgetarium: show the left sidebar" },
	right: { open: "Widgetarium: hide the right sidebar", folded: "Widgetarium: show the right sidebar" },
};

export function foldLabel(name, folded) {
	return FOLD_LABEL[name][folded ? "folded" : "open"];
}
