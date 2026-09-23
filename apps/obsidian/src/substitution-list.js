import { createElement as h } from "react";
import { Icon, List, Pill, Sidebar, SidebarGroup, SidebarRow, cx } from "@widgetarium/kit";
import { ruleBlock } from "./substitution.js";
import { ruleStatus, triggerLabel } from "./substitution-say.js";

const TITLE = "Substitutions";
const LEAD = "A trigger you write in a note, and the widget it draws instead";
const RULES = "Rules";
const NEW_RULE = "New substitution";
const NOTHING_YET = "Nothing here yet";
const UNTITLED = "Untitled";

export function RuleList({ editing, onPicked, className }) {
	return h(Sidebar, { className: cx("wg-sub-list", className) }, [
		h("div", { key: "head", className: "wg-sub-side-head" }, [
			h("h2", { key: "title", className: "wg-sub-side-title" }, TITLE),
			h("p", { key: "lead", className: "wg-sub-side-lead" }, LEAD),
		]),
		h(
			SidebarGroup,
			{ key: "rules", label: RULES, className: "wg-sub-rules" },
			editing.rules.length === 0
				? h("p", { className: "wg-sub-empty-list" }, NOTHING_YET)
				: editing.rules.map((entry) =>
						h(SidebarRow, {
							key: entry.id,
							as: "button",
							className: cx("wg-sub-item", !entry.enabled && "is-disabled"),
							selected: entry.id === editing.rule?.id,
							onClick: () => {
								editing.open(entry.id);
								onPicked?.();
							},
							label: entry.name || UNTITLED,
							sub: h("span", { className: "wg-sub-trg" }, triggerLabel(entry)),
							value: mark(entry),
						}),
					),
		),
		h(
			"div",
			{ key: "foot", className: "wg-kit-side-group wg-sub-side-foot" },
			h(
				List,
				{ className: "wg-kit-side-list" },
				h(SidebarRow, {
					as: "button",
					className: "wg-sub-new",
					icon: h(Icon, { name: "plus", size: 14 }),
					label: NEW_RULE,
					onClick: () => {
						editing.add();
						onPicked?.();
					},
				}),
			),
		),
	]);
}

function mark(rule) {
	if (!ruleBlock(rule)) return null;
	const status = ruleStatus(rule);
	return h(Pill, { tone: status.tone, className: "wg-sub-mark" }, status.say);
}
