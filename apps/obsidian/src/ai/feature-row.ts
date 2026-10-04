import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Checkbox, Pill, Row } from "@widgetarium/kit";
import type { AppSpec } from "@widgetarium/core/app-spec.js";
import { rowText } from "./spec-rows.js";

export interface FeatureRowProps {
	readonly feature: AppSpec["features"][number];
	readonly isLocked: boolean;
	readonly onToggle: () => void;
}

export function FeatureRow({ feature, isLocked, onToggle }: FeatureRowProps): ReactElement {
	const press = { type: "button", "aria-pressed": feature.kept, disabled: isLocked, onClick: onToggle };
	const className = [feature.kept ? null : "is-off", isLocked ? "is-locked" : null].filter(Boolean).join(" ");
	return h(
		Row,
		{ asChild: true, pressable: !isLocked, className: className || undefined },
		h("button", press, [
			h(Checkbox, { key: "check", checked: feature.kept }),
			rowText(feature.title, feature.says),
			feature.mark ? h(Pill, { key: "mark", tone: "accent", size: "s" }, feature.mark) : null,
		]),
	);
}
