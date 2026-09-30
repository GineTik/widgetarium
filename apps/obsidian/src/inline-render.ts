import { createElement as h } from "react";
import { MarkdownRenderChild } from "obsidian";
import type { App, MarkdownPostProcessorContext } from "obsidian";
import { render } from "@widgetarium/core/engine/render.js";
import { traceSub } from "@widgetarium/core/trace.js";
import { viewHost } from "@widgetarium/core/engine/view-host.js";
import { NO_HOST } from "@widgetarium/core/engine/host-none.js";
import type { HostClaimingNothing } from "@widgetarium/core/engine/host-none.js";
import { UNREADABLE } from "@widgetarium/core/engine/read-file.js";
import type { Navigation, PassageReader, ViewHost } from "@widgetarium/core/gateway/host.js";
import type { WidgetLookup } from "@widgetarium/core/registry.js";
import { activeRules, matchLines } from "./substitution.js";
import type { Rule, RuleSpan } from "./substitution.js";
import { InlineWidget } from "./inline-widget.js";
import { passageHere, passageReader } from "./passage.js";
import type { SectionLines } from "./passage.js";

export { InlineWidget } from "./inline-widget.js";
export { passageHere, passageReader } from "./passage.js";

export interface SubstitutingHost extends ViewHost {
	readonly navigator?: Navigation | null;
	readonly reader?: PassageReader | null;
}

export type SubstitutionContext = Pick<MarkdownPostProcessorContext, "sourcePath" | "addChild"> & {
	getSectionInfo?(element: HTMLElement): SectionLines | null;
};

export interface SubstituteAsk {
	readonly element: HTMLElement;
	readonly context: SubstitutionContext;
	readonly rules: readonly Rule[] | null | undefined;
	readonly registry: WidgetLookup;
	readonly app: App;
	readonly host: SubstitutingHost | null | undefined;
}

interface Tools {
	readonly doc: Document;
	readonly element: HTMLElement;
	readonly context: SubstitutionContext;
	readonly registry: WidgetLookup;
	readonly app: App;
	readonly navigator: Navigation | null;
	readonly reader: PassageReader;
	readonly environment: ViewHost | HostClaimingNothing;
	readonly sourcePath: string;
	section: SectionLines | null;
}

const BLOCK_SELECTOR = "p, li";
const GUARDS = [".wg-mount", ".wg-inline", ".wg-root", "pre", "code"];
const GUARDED = GUARDS.join(", ");
const CLIP_CHARS = 60;
const TEXT_NODE = 3;
export const HOST_CLASS = "wg-inline-host wg-root";

export function substituteIn({ element, context, rules, registry, app, host }: SubstituteAsk): number {
	traceSub("process", () => ({
		path: context?.sourcePath ?? null,
		element: elementOf(element),
		blocks: blocksAtOrUnder(element, BLOCK_SELECTOR).length,
		rules: rules?.length ?? 0,
		live: activeRules(rules ?? []).length,
	}));
	if (!rules || rules.length === 0) {
		traceSub("process done", () => ({ path: context?.sourcePath ?? null, seen: 0, drawn: 0, why: "no rules" }));
		return 0;
	}
	const tools: Tools = {
		doc: element.ownerDocument,
		element,
		context,
		registry,
		app,
		navigator: host?.navigator ?? null,
		reader: host?.reader ?? UNREADABLE,
		environment: host ? viewHost(host) : NO_HOST,
		sourcePath: context.sourcePath,
		section: null,
	};
	let drawn = 0;
	let seen = 0;
	for (const block of blocksAtOrUnder(element, BLOCK_SELECTOR)) {
		if (isSkipped(block)) continue;
		seen += 1;
		drawn += substituteBlock(block, rules, tools);
	}
	traceSub("process done", { path: tools.sourcePath, seen, drawn });
	return drawn;
}

function isSkipped(block: HTMLElement): boolean {
	if (!block.isConnected) {
		traceSub("block skipped", () => ({ block: elementOf(block), why: "not connected" }));
		return true;
	}
	const guard = block.closest(GUARDED);
	if (!guard) return false;
	traceSub("block skipped", () => ({ block: elementOf(block), why: `inside ${guardName(guard)}` }));
	return true;
}

function blocksAtOrUnder(element: HTMLElement, selector: string): HTMLElement[] {
	const found = [...element.querySelectorAll<HTMLElement>(selector)];
	return element.matches?.(selector) ? [element, ...found] : found;
}

function lineGroupsOf(block: HTMLElement): ChildNode[][] {
	const groups: ChildNode[][] = [[]];
	for (const node of [...block.childNodes]) {
		if (node.nodeName === "BR") {
			groups.push([]);
			continue;
		}
		groups[groups.length - 1]?.push(node);
	}
	return groups;
}

function textOf(group: readonly ChildNode[]): string {
	return group.map((node) => node.textContent ?? "").join("");
}

function textUnlessQuotedAsCode(group: readonly ChildNode[]): string {
	const lead = group.find((node) => node.nodeType !== TEXT_NODE || (node.textContent ?? "").trim() !== "");
	return lead?.nodeName === "CODE" ? "" : textOf(group);
}

function clippedForTheLog(text: unknown): string {
	const one = String(text ?? "")
		.replace(/\s+/g, " ")
		.trim();
	return one.length > CLIP_CHARS ? `${one.slice(0, CLIP_CHARS)}…` : one;
}

function elementOf(node: Element | null | undefined): string {
	const name = String(node?.tagName ?? "?").toLowerCase();
	const classes = String(node?.className ?? "").trim();
	return classes ? `${name}.${classes.split(/\s+/).join(".")}` : name;
}

function guardName(node: Element): string {
	return GUARDS.find((one) => node.matches(one)) ?? elementOf(node);
}

function hostFor(span: RuleSpan, rawLines: readonly string[], tools: Tools): HTMLElement {
	traceSub("substitute", () => ({
		rule: span.rule.id,
		widget: span.rule.widget,
		lines: [span.from, span.to],
		text: clippedForTheLog(rawLines[0]),
	}));
	const node = tools.doc.createElement("div");
	node.className = HOST_CLASS;
	const definition = tools.registry.get(span.rule.widget);
	const here = passageHere({
		app: tools.app,
		sourcePath: tools.sourcePath,
		rawLines,
		rule: span.rule,
		content: span.content,
		section: tools.section,
	});
	const raw = rawLines.join("\n");
	render(
		h(InlineWidget, {
			definition,
			here,
			navigator: tools.navigator,
			host: tools.environment,
			reader: passageReader(tools.reader, raw),
			raw,
		}),
		node,
	);
	unmountWhenTheNoteCloses(node, tools.context);
	traceSub("substituted", () => ({
		rule: span.rule.id,
		widget: span.rule.widget,
		host: elementOf(node),
		resolved: Boolean(definition?.component),
	}));
	return node;
}

function unmountWhenTheNoteCloses(node: HTMLElement, context: SubstitutionContext): void {
	const child = new MarkdownRenderChild(node);
	child.onunload = () => render(null, node);
	context.addChild(child);
}

function substituteBlock(block: HTMLElement, rules: readonly Rule[], tools: Tools): number {
	const groups = lineGroupsOf(block);
	const lines = groups.map(textOf);
	const probes = groups.map(textUnlessQuotedAsCode);
	const spans = matchLines(probes, rules);
	traceSub("block considered", () => ({
		block: elementOf(block),
		tested: probes.map(clippedForTheLog),
		matched: spans.map((span) => `${span.rule.id} → ${span.rule.widget}`),
	}));
	const [only] = spans;
	if (!only) {
		traceSub("block done", { made: 0 });
		return 0;
	}

	tools.section = tools.context.getSectionInfo?.(block) ?? null;
	const rawOf = (span: RuleSpan): string[] => lines.slice(span.from, span.to + 1);
	const whole = spans.length === 1 && only.from === 0 && only.to === groups.length - 1;
	if (whole) return fillWholeBlock(block, hostFor(only, rawOf(only), tools), tools);

	const next = tools.doc.createDocumentFragment();
	let at = 0;
	while (at < groups.length) {
		const span = spans.find((entry) => entry.from === at);
		if (span) {
			next.appendChild(hostFor(span, rawOf(span), tools));
			at = span.to + 1;
			continue;
		}
		for (const node of groups[at] ?? []) next.appendChild(node);
		if (at < groups.length - 1) next.appendChild(tools.doc.createElement("br"));
		at += 1;
	}
	block.replaceChildren(next);
	traceSub("block done", { made: spans.length, how: "lines spliced" });
	return spans.length;
}

function fillWholeBlock(block: HTMLElement, drawn: HTMLElement, tools: Tools): number {
	const belongsToReadingView = block === tools.element;
	if (belongsToReadingView) block.replaceChildren(drawn);
	else block.replaceWith(drawn);
	traceSub("block done", { made: 1, how: belongsToReadingView ? "whole block filled" : "whole block replaced" });
	return 1;
}
