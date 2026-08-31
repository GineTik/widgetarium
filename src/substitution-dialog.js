import { createElement as h } from "react";
import { render } from "./engine/render.js";
import { useState } from "react";
import { DialogClose, DialogContent, DialogOverlay } from "./dialog.js";
import { Button, Card, Field, Icon, IconButton, Pill, Segmented, Sidebar, SidebarGroup, SidebarRow, Switch, cx } from "./kit.js";
import { matchLines, newRule, ruleBlock, ruleError } from "./substitution.js";
import { sampleFromPattern } from "./regex-sample.js";
import { inlineWidgets } from "./registry.js";
import { previewHere, previewHost, previewNavigator, previewReader } from "./preview.js";
import { openCatalogue } from "./catalogue-dialog.js";
import { InlineWidget } from "./inline-render.js";

const TABS = [
	{ value: "line", label: "Line" },
	{ value: "wrapped", label: "Wrapped" },
	{ value: "regex", label: "Regex" },
];

// CONTEXT: the head's one fact — what substitution.js checks before a rule is allowed to run
const BLOCKED = {
	error: { tone: "error", say: "Not valid" },
	draft: { tone: "warning", say: "Draft" },
	off: { tone: "neutral", say: "Off" },
};
const RUNNING = { tone: "success", say: "Live" };

export function ruleStatus(rule) {
	return BLOCKED[ruleBlock(rule)] ?? RUNNING;
}

export function triggerLabel(rule) {
	if (rule.mode === "regex") return "regex";
	if (rule.mode === "wrapped") return `${rule.open} … ${rule.close}`;
	return rule.open;
}

// CONTEXT: the widget's own sample text, so the example is one the widget can actually draw
export function defaultSample(rule, definition) {
	const written = definition?.manifest?.preview?.content ?? "call Olena before Friday";
	if (rule.mode === "line") return `${rule.open} ${written.split("\n")[0]}`;
	if (rule.mode === "wrapped") {
		return [rule.open, "Check before release:", "access rights, error log.", rule.close || rule.open].join("\n");
	}
	const first = sampleFromPattern(rule.pattern, 0);
	return first ? [first, "a line that does not match"].join("\n") : "";
}

function Sentence({ rule, patch, choices, registry, host, available, onInstall, error }) {
	const chosen = choices.find((entry) => entry.manifest.id === rule.widget);
	// CONTEXT: the same catalogue the board picks from, asked for the widgets that stand in text
	const picker = h(
		Button,
		{
			key: "widget",
			size: "s",
			className: "wg-sub-pick",
			onClick: () => {
				const close = openCatalogue({
					registry,
					host,
					mode: "text",
					kind: "inline",
					available,
					onInstall,
					onPick: (id) => {
						patch({ widget: id });
						close();
					},
				});
			},
		},
		[
			h("span", { key: "name" }, chosen?.manifest.title ?? "Choose a widget"),
			h(Icon, { key: "caret", name: "chevron", size: 12, className: "wg-sub-caret" }),
		],
	);

	const trigger = (key, value, placeholder, wide) =>
		h(Field, {
			key,
			size: "s",
			value,
			placeholder,
			className: cx("wg-sub-trigger", wide && "is-wide"),
			onInput: (event) => patch({ [key]: event.target.value }),
		});

	const words = { line: "When a line starts with", wrapped: "When a block opens with", regex: "When a line matches" };
	const parts = [h("span", { key: "w0" }, words[rule.mode])];
	if (rule.mode === "regex") parts.push(trigger("pattern", rule.pattern, "^@(\\d{1,2}:\\d{2})\\s+(.+)$", true));
	else parts.push(trigger("open", rule.open, "!"));
	if (rule.mode === "wrapped") {
		parts.push(h("span", { key: "w1" }, "and closes with"));
		parts.push(trigger("close", rule.close, ":::"));
		parts.push(h("span", { key: "w2" }, "draw what is between with"));
	} else {
		parts.push(h("span", { key: "w1" }, "draw it with"));
	}
	parts.push(picker);

	return h("div", { className: "wg-sub-sentence" }, [
		h("div", { key: "line", className: "wg-sub-words" }, parts),
		error ? h("div", { key: "why", className: "wg-sub-error" }, error) : null,
	]);
}

// CONTEXT: the number hangs to the left and the stage's content starts under its name, so the
// three read as three blocks instead of one column of lines
function Step({ index, name, children }) {
	return h("section", { className: "wg-sub-step" }, [
		h("h4", { key: "label", className: "wg-sub-step-label" }, [
			h("span", { key: "no", className: "wg-sub-step-no" }, String(index)),
			h("span", { key: "name" }, name),
		]),
		h("div", { key: "body", className: "wg-sub-step-body" }, children),
	]);
}

function Example({ rule, registry, host, sample, onSample }) {
	const lines = sample.split("\n");
	// CONTEXT: the editor previews the DRAFT, so the rule is read as if it were already published
	const spans = matchLines(lines, [{ ...rule, draft: false, enabled: true }]);
	const definition = registry.get(rule.widget);

	const out = [];
	let at = 0;
	while (at < lines.length) {
		const span = spans.find((entry) => entry.from === at);
		if (span) {
			out.push(
				h(InlineWidget, {
					key: `w${at}`,
					definition,
					here: previewHere(span.content),
					navigator: previewNavigator,
					reader: previewReader(definition?.manifest),
					host: previewHost(host),
					raw: lines.slice(span.from, span.to + 1).join("\n"),
				}),
			);
			at = span.to + 1;
			continue;
		}
		out.push(h("p", { key: `p${at}`, className: "wg-sub-plain" }, lines[at] || " "));
		at += 1;
	}

	// CONTEXT: no "you write" / "you see" — the stage is named already, and the pair is an editable
	// line above what it draws
	return h("div", { className: "wg-sub-example" }, [
		h("textarea", {
			key: "in",
			className: "wg-sub-sample",
			value: sample,
			spellCheck: false,
			rows: Math.min(6, Math.max(2, lines.length)),
			onInput: (event) => onSample(event.target.value),
		}),
		h("div", { key: "out", className: "wg-sub-out" }, out),
	]);
}

export function SubstitutionDialog({ rules, registry, host, available = [], onInstall, onChange, onClose }) {
	const [selectedId, setSelectedId] = useState(rules[0]?.id ?? null);
	const [samples, setSamples] = useState({});
	const rule = rules.find((entry) => entry.id === selectedId) ?? rules[0] ?? null;
	const choices = inlineWidgets(registry.list());

	const patch = (next) => onChange(rules.map((entry) => (entry.id === rule.id ? { ...entry, ...next, draft: true } : entry)));
	const publish = () => onChange(rules.map((entry) => (entry.id === rule.id ? { ...entry, draft: false } : entry)));
	const drop = () => {
		const left = rules.filter((entry) => entry.id !== rule.id);
		setSelectedId(left[0]?.id ?? null);
		onChange(left);
	};
	const add = () => {
		const created = newRule(rules);
		setSelectedId(created.id);
		onChange([...rules, created]);
	};

	// CONTEXT: the same sidebar the settings panel and a card's properties are built from — the
	// list of rules is a list of named values like any other
	const side = h(
		"aside",
		{ key: "side", className: "wg-sub-side" },
		h(Sidebar, { key: "list", mode: "full", className: "wg-sub-list" }, [
			h("div", { key: "head", className: "wg-sub-side-head" }, [
				h("b", { key: "t" }, "Substitutions"),
				h(IconButton, { key: "new", variant: "accent", size: "xs", label: "New substitution", onClick: add }, h(Icon, { name: "plus", size: 15 })),
			]),
			h(
				SidebarGroup,
				{ key: "rules", className: "wg-sub-rules" },
				rules.map((entry) =>
					h(SidebarRow, {
						key: entry.id,
						as: "button",
						className: cx("wg-sub-item", !entry.enabled && "is-disabled"),
						selected: entry.id === rule?.id,
						onClick: () => setSelectedId(entry.id),
						label: entry.name || "Untitled",
						value: entry.draft
							? h("span", { className: "wg-sub-draft" }, "draft")
							: h("span", { className: "wg-sub-trg" }, triggerLabel(entry)),
					}),
				),
			),
		]),
	);

	if (!rule) {
		return h(DialogOverlay, { className: "wg-sub-over", onClose }, [
			h(DialogContent, { key: "content", className: "wg-sub-dialog" }, [
				h(DialogClose, { key: "x", onClose }),
				h("div", { key: "body", className: "wg-sub-body" }, [
					
					h("section", { key: "editor", className: "wg-sub-editor is-empty" }, [
						h("p", { key: "why" }, "A substitution turns a line of text into a widget."),
						h(Button, { key: "new", variant: "accent", onClick: add }, "New substitution"),
					]),
					side,
				]),
			]),
		]);
	}

	const error = ruleError(rule);
	const sample = samples[rule.id] ?? defaultSample(rule, registry.get(rule.widget));

	const status = ruleStatus(rule);

	// CONTEXT: what the rule IS on the left, what you may do to it on the right, one 34px band
	const editor = h("section", { key: "editor", className: "wg-sub-editor" }, [
		h("div", { key: "head", className: "wg-sub-head" }, [
			h(Field, {
				key: "name",
				size: "s",
				value: rule.name,
				placeholder: "Name",
				className: "wg-sub-name",
				onInput: (event) => patch({ name: event.target.value }),
			}),
			// CONTEXT: a bare switch names nothing, so the word and the control are one group
			h(Card, { key: "on", variant: "solid", className: "wg-sub-power" }, [
				h("span", { key: "word", className: "wg-sub-power-word" }, "Enabled"),
				h(Switch, { key: "switch", checked: rule.enabled, onChange: (next) => patch({ enabled: next }), label: "Enabled" }),
			]),
			h(Pill, { key: "state", tone: status.tone, className: "wg-sub-state" }, status.say),
			h("span", { key: "gap", className: "wg-sub-spacer" }),
			h(Button, { key: "del", size: "s", onClick: drop }, "Delete"),
			h(Button, { key: "save", size: "s", variant: "accent", disabled: Boolean(error), onClick: publish }, "Save"),
		]),
		h(
			Step,
			{ key: "match", index: 1, name: "How it matches" },
			h(Segmented, {
				className: "wg-sub-tabs",
				size: "s",
				items: TABS,
				value: rule.mode,
				onChange: (mode) => patch({ mode }),
			}),
		),
		h(
			Step,
			{ key: "rule", index: 2, name: "The rule" },
			h(Sentence, { rule, patch, choices, registry, host, available, onInstall, error }),
		),
		h(
			Step,
			{ key: "result", index: 3, name: "The result" },
			h(Example, {
				rule,
				registry,
				host,
				sample,
				onSample: (next) => setSamples({ ...samples, [rule.id]: next }),
			}),
		),
	]);

	return h(DialogOverlay, { className: "wg-sub-over", onClose }, [
		h(DialogContent, { key: "content", className: "wg-sub-dialog" }, [
			h(DialogClose, { key: "x", onClose }),
			h("div", { key: "body", className: "wg-sub-body" }, [editor, side]),
		]),
	]);
}

// CONTEXT: the ribbon has no preact tree to hang this on, so the surface brings its own
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
