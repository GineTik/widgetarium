import { createElement as h } from "react";
import { useRef, useState } from "react";
import type { MouseEvent, ReactElement } from "react";
import { render } from "@widgetarium/core/engine/render.js";
import { DialogClose, DialogContent, DialogOverlay } from "@widgetarium/core/dialog.js";
import { Button, Icon, cn } from "@widgetarium/kit";
import { classOf } from "@widgetarium/core/paths.js";
import { useWidth } from "@widgetarium/core/use-width.js";
import { openCatalogue } from "@widgetarium/core/catalogue-dialog.js";
import type { CatalogueDefinition } from "@widgetarium/core/catalogue-entries.js";
import type { OnInstall } from "@widgetarium/core/catalogue-install-press.js";
import type { CatalogueHost } from "@widgetarium/core/catalogue-preview.js";
import type { WidgetLookup } from "@widgetarium/core/registry.js";
import type { Rule } from "./substitution.js";
import { useRuleEditing } from "./use-rule-editing.js";
import type { RulePatch } from "./use-rule-editing.js";
import { RuleList } from "./substitution-list.js";
import { RuleEditor } from "./substitution-editor.js";
import { EmptyRules } from "./substitution-empty.js";

export interface SubstitutionDialogProps {
	readonly rules: readonly Rule[];
	readonly registry: WidgetLookup;
	readonly host: CatalogueHost | null | undefined;
	readonly available?: readonly CatalogueDefinition[];
	readonly onInstall?: OnInstall;
	readonly onChange: (next: Rule[]) => void;
	readonly onClose: () => void;
}

export interface SubstitutionsAsk extends Omit<SubstitutionDialogProps, "onChange" | "onClose"> {
	readonly onChange?: (next: Rule[]) => void;
	readonly onClose?: () => void;
}

interface InlinePick {
	readonly registry: WidgetLookup;
	readonly host: CatalogueHost | null | undefined;
	readonly available: readonly CatalogueDefinition[];
	readonly onInstall: OnInstall | undefined;
	readonly onPick: (patch: RulePatch) => void;
}

const OPEN_LIST = "Substitutions";

export function SubstitutionDialog(props: SubstitutionDialogProps): ReactElement {
	const { rules, registry, host, available = [], onInstall, onChange, onClose } = props;
	const editing = useRuleEditing(rules, onChange);
	const [isSheetOpen, setSheetOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const phone = isPhone(useWidth(rootRef));
	const pickWidget = (): void => pickInlineWidget({ registry, host, available, onInstall, onPick: editing.patch });

	return h(
		DialogOverlay,
		{ className: "wg-sub-over", onClose },
		h(DialogContent, { className: "wg-sub-dialog" }, [
			h(DialogClose, { key: "x", onClose }),
			h("div", { key: "body", className: cn("wg-sub", phone && "is-phone"), ref: rootRef }, [
				phone ? null : h(RuleList, { key: "side", editing, className: "wg-sub-side" }),
				h("section", { key: "main", className: "wg-sub-main" }, [
					phone
						? h(Button, { key: "open", className: "wg-sub-open", onClick: () => setSheetOpen(true) }, [
								h(Icon, { key: "mark", name: "menu", size: 15 }),
								h("span", { key: "said" }, OPEN_LIST),
							])
						: null,
					editing.rule
						? h(RuleEditor, { key: "editor", editing, rule: editing.rule, registry, host, onPickWidget: pickWidget })
						: h(EmptyRules, { key: "empty", onAdd: editing.add }),
				]),
				phone && isSheetOpen
					? h(
							"div",
							{
								key: "sheet",
								className: "wg-sub-sheet-over",
								onClick: (event: MouseEvent<HTMLDivElement>) =>
									event.target === event.currentTarget && setSheetOpen(false),
							},
							h(RuleList, { editing, className: "wg-sub-sheet", onPicked: () => setSheetOpen(false) }),
						)
					: null,
			]),
		]),
	);
}

export function openSubstitutions(options: SubstitutionsAsk): () => void {
	const node = document.createElement("div");
	const close = (): void => {
		render(null, node);
		options.onClose?.();
	};
	const draw = (rules: readonly Rule[]): void =>
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

function pickInlineWidget({ registry, host, available, onInstall, onPick }: InlinePick): void {
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

function isPhone(width: number): boolean {
	return width > 0 && classOf(width).name === "phone";
}
