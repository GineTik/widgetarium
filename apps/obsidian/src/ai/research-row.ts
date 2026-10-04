import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Checkbox, Icon, Row } from "@widgetarium/kit";
import type { AppSpec } from "@widgetarium/core/app-spec.js";
import { rowText } from "./spec-rows.js";

export interface ResearchRowProps {
	readonly research: AppSpec["research"][number];
	readonly isLocked: boolean;
	readonly onToggle: () => void;
}

const OPEN = "Open {product}";
const FOLLOW = "Follow {product}";

export function ResearchRow({ research, isLocked, onToggle }: ResearchRowProps): ReactElement {
	const label = FOLLOW.replace("{product}", research.product);
	const check = h(Checkbox, {
		key: "check",
		checked: research.kept,
		label,
		onCheckedChange: isLocked ? undefined : onToggle,
	});
	return h(Row, { className: research.kept ? "wg-ai-spec-reference" : "wg-ai-spec-reference is-off" }, [
		check,
		linkTo(research),
	]);
}

function linkTo(research: ResearchRowProps["research"]): ReactElement {
	const label = OPEN.replace("{product}", research.product);
	const link = {
		key: "open",
		className: "wg-ai-spec-link",
		href: research.url,
		target: "_blank",
		rel: "noopener",
		title: label,
	};
	return h("a", link, [
		rowText(research.product, research.takes),
		h(Icon, { key: "icon", name: "external-link", size: 16, className: "wg-ai-spec-link-icon" }),
	]);
}
