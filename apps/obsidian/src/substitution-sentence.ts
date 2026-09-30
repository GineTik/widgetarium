import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Field, Icon, cn } from "@widgetarium/kit";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import type { Rule } from "./substitution.js";
import { MATCH_WORDS } from "./substitution-say.js";
import type { RulePatch } from "./use-rule-editing.js";

export interface RuleSentenceProps {
	readonly rule: Rule;
	readonly patch: (next: RulePatch) => void;
	readonly chosen: { readonly manifest?: unknown } | null | undefined;
	readonly onPickWidget: () => void;
	readonly error: string | null;
}

type TriggerField = "pattern" | "open" | "close";

const CHOOSE = "Choose a widget";
const OPEN_PLACEHOLDER = "!";
const CLOSE_PLACEHOLDER = ":::";
const PATTERN_PLACEHOLDER = "^@(\\d{1,2}:\\d{2})\\s+(.+)$";

export function RuleSentence({ rule, patch, chosen, onPickWidget, error }: RuleSentenceProps): ReactElement {
	const words = MATCH_WORDS[rule.mode];
	const trigger = (key: TriggerField, value: string, placeholder: string, wide = false): ReactElement =>
		h(Field, {
			key,
			value,
			placeholder,
			className: cn("wg-sub-trigger", wide && "is-wide"),
			onValueChange: (typed: string) => patch({ [key]: typed }),
		});

	return h("div", { className: "wg-sub-sentence" }, [
		h("div", { key: "line", className: "wg-sub-words" }, [
			h("span", { key: "opens", className: "wg-sub-word" }, words.opens),
			rule.mode === "regex"
				? trigger("pattern", rule.pattern, PATTERN_PLACEHOLDER, true)
				: trigger("open", rule.open, OPEN_PLACEHOLDER),
			words.closes ? h("span", { key: "closes", className: "wg-sub-word" }, words.closes) : null,
			words.closes ? trigger("close", rule.close, CLOSE_PLACEHOLDER) : null,
			h("span", { key: "draws", className: "wg-sub-word" }, words.draws),
			h(
				Button,
				{
					key: "widget",
					className: cn("wg-sub-pick", !chosen && "is-unset"),
					onClick: onPickWidget,
				},
				[
					h("span", { key: "name" }, titleOf(chosen) ?? CHOOSE),
					h(Icon, { key: "caret", name: "chevron", size: 14, className: "wg-sub-caret" }),
				],
			),
		]),
		error ? h("p", { key: "why", className: "wg-sub-error" }, error) : null,
	]);
}

function titleOf(chosen: { readonly manifest?: unknown } | null | undefined): string | undefined {
	const manifest = chosen?.manifest;
	const title = isObject(manifest) ? manifest["title"] : undefined;
	return title === undefined || title === null ? undefined : String(title);
}
