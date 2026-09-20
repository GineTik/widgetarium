import { createElement as h } from "react";
import { useRef, useState } from "react";
import { render } from "./engine/render.js";
import { DialogClose, DialogContent, DialogOverlay } from "./dialog.js";
import { Button, Icon, cx } from "./kit.js";
import { classOf } from "./paths.js";
import { useWidth } from "./use-width.js";
import { useRuleEditing } from "./use-rule-editing.js";
import { RuleList } from "./substitution-list.js";
import { RuleEditor } from "./substitution-editor.js";
import { EmptyRules } from "./substitution-empty.js";
import { openCatalogue } from "./catalogue-dialog.js";

const OPEN_LIST = "Substitutions";

export function SubstitutionDialog({ rules, registry, host, available = [], onInstall, onChange, onClose }) {
	const editing = useRuleEditing(rules, onChange);
	const [isSheetOpen, setSheetOpen] = useState(false);
	const rootRef = useRef(null);
	const phone = isPhone(useWidth(rootRef));
	const pickWidget = () => pickInlineWidget({ registry, host, available, onInstall, onPick: editing.patch });

	return h(
		DialogOverlay,
		{ className: "wg-sub-over", onClose },
		h(DialogContent, { className: "wg-sub-dialog" }, [
			h(DialogClose, { key: "x", onClose }),
			h("div", { key: "body", className: cx("wg-sub", phone && "is-phone"), ref: rootRef }, [
				phone ? null : h(RuleList, { key: "side", editing, className: "wg-sub-side" }),
				h("section", { key: "main", className: "wg-sub-main" }, [
					phone
						? h(Button, { key: "open", className: "wg-sub-open", onClick: () => setSheetOpen(true) }, [
								h(Icon, { key: "mark", name: "menu", size: 15 }),
								h("span", { key: "said" }, OPEN_LIST),
							])
						: null,
					editing.rule
						? h(RuleEditor, { key: "editor", editing, registry, host, onPickWidget: pickWidget })
						: h(EmptyRules, { key: "empty", onAdd: editing.add }),
				]),
				phone && isSheetOpen
					? h(
							"div",
							{
								key: "sheet",
								className: "wg-sub-sheet-over",
								onClick: (event) => event.target === event.currentTarget && setSheetOpen(false),
							},
							h(RuleList, { editing, className: "wg-sub-sheet", onPicked: () => setSheetOpen(false) }),
						)
					: null,
			]),
		]),
	);
}

export function openSubstitutions(options) {
	const node = document.createElement("div");
	const close = () => {
		render(null, node);
		options.onClose?.();
	};
	const draw = (rules) =>
		render(
			h(SubstitutionDialog, {
				...options,
				rules,
				onChange: (next) => {
					options.onChange?.(next);
					draw(next);
				},
				onClose: close,
			}),
			node,
		);
	draw(options.rules);
	return close;
}

function pickInlineWidget({ registry, host, available, onInstall, onPick }) {
	const { close } = openCatalogue({
		registry,
		host,
		mode: "text",
		kind: "inline",
		available,
		onInstall,
		onPick: (widget) => {
			onPick({ widget });
			close();
		},
	});
}

function isPhone(width) {
	return width > 0 && classOf(width).name === "phone";
}
