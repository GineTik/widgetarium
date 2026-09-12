import { createElement as h } from "react";
import { Button, Field, Icon, cx } from "./kit.js";
import { MATCH_WORDS } from "./substitution-say.js";

const CHOOSE = "Choose a widget";
const OPEN_PLACEHOLDER = "!";
const CLOSE_PLACEHOLDER = ":::";
const PATTERN_PLACEHOLDER = "^@(\\d{1,2}:\\d{2})\\s+(.+)$";

export function RuleSentence({ rule, patch, chosen, onPickWidget, error }) {
	const words = MATCH_WORDS[rule.mode];
	const trigger = (key, value, placeholder, wide) =>
		h(Field, {
			key,
			value,
			placeholder,
			className: cx("wg-sub-trigger", wide && "is-wide"),
			onInput: (event) => patch({ [key]: event.target.value }),
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
					className: cx("wg-sub-pick", !chosen && "is-unset"),
					onClick: onPickWidget,
				},
				[
					h("span", { key: "name" }, chosen?.manifest?.title ?? CHOOSE),
					h(Icon, { key: "caret", name: "chevron", size: 14, className: "wg-sub-caret" }),
				],
			),
		]),
		error ? h("p", { key: "why", className: "wg-sub-error" }, error) : null,
	]);
}
