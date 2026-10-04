import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Checkbox, Pill, Row } from "@widgetarium/kit";
import type { AppSpec } from "@widgetarium/core/app-spec.js";
import { rowText } from "./spec-rows.js";

export interface FeatureRowProps {
	readonly feature: AppSpec["features"][number];
	readonly onToggle: () => void;
}

export function FeatureRow({ feature, onToggle }: FeatureRowProps): ReactElement {
	const press = { type: "button", "aria-pressed": feature.kept, onClick: onToggle };
	return h(
		Row,
		{ asChild: true, pressable: true, className: feature.kept ? undefined : "is-off" },
		h("button", press, [
			h(Checkbox, { key: "check", checked: feature.kept }),
			rowText(feature.title, feature.says),
			feature.mark ? h(Pill, { key: "mark", tone: "accent", size: "s" }, feature.mark) : null,
		]),
	);
}
