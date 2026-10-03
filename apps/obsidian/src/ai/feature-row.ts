import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, Pill } from "@widgetarium/kit";
import type { AppSpec } from "@widgetarium/core/app-spec.js";
import { rowText } from "./spec-rows.js";

export interface FeatureRowProps {
	readonly feature: AppSpec["features"][number];
	readonly onToggle: () => void;
}

const KEEP = "Keep {title}";
const LEAVE_OUT = "Leave out {title}";

export function FeatureRow({ feature, onToggle }: FeatureRowProps): ReactElement {
	return h("div", { className: `wg-ai-spec-row${feature.kept ? "" : " is-off"}` }, [
		checkButton({ feature, onToggle }),
		rowText(feature.title, feature.says),
		feature.mark ? h(Pill, { key: "mark", tone: "accent", size: "s" }, feature.mark) : null,
	]);
}

function checkButton({ feature, onToggle }: FeatureRowProps): ReactElement {
	const label = (feature.kept ? LEAVE_OUT : KEEP).replace("{title}", feature.title);
	const pressed = { "aria-pressed": feature.kept, "aria-label": label, onClick: onToggle };
	const mark = feature.kept ? h(Icon, { name: "tick", size: 16 }) : null;
	return h("button", { key: "check", type: "button", className: "wg-ai-spec-check", ...pressed }, mark);
}
