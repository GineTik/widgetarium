import { createElement as h, useState } from "react";
import { render } from "@widgetarium/core/engine/render.js";
import { drawWidget } from "@widgetarium/core/mounted.js";
import { MarkdownRenderChild } from "obsidian";
import { activeRules, matchLines, renderSpan } from "./substitution.js";
import { traceSub } from "@widgetarium/core/trace.js";
import { findLines, replaceLines } from "@widgetarium/core/engine/text-span.js";
import { viewHost } from "@widgetarium/core/engine/view-host.js";
import { NO_HOST } from "@widgetarium/core/engine/host-none.js";
import { UNREADABLE, refuseRead } from "@widgetarium/core/engine/read-file.js";
import { previewGateways } from "@widgetarium/core/preview.js";
import { InlineMenu } from "./inline-menu.js";

const BLOCK_SELECTOR = "p, li";
const GUARDS = [".wg-mount", ".wg-inline", ".wg-root", "pre", "code"];
const GUARDED = GUARDS.join(", ");
const CLIP_CHARS = 60;
export const HOST_CLASS = "wg-inline-host wg-root";

export function InlineWidget({ definition, here, navigator, raw, host, reader }) {
	const [isText, setText] = useState(false);
	const menu = h(InlineMenu, { key: "menu", isText, onShowSource: () => setText(!isText) });

	if (isText)
		return h("div", { className: "wg-inline is-text" }, [
			h("span", { key: "raw", className: "wg-inline-raw" }, raw),
			menu,
		]);
	if (!definition?.component) {
		return h("div", { className: "wg-inline is-missing" }, [
			h("span", { key: "raw", className: "wg-inline-raw" }, raw),
			h("span", { key: "why", className: "wg-inline-why" }, "widget not installed"),
			menu,
		]);
	}

	return h("div", { className: "wg-inline" }, [
		h(
			"div",
			{ key: "view", className: "wg-inline-view" },
			drawWidget(definition, {
				...previewGateways(definition.manifest),
				here,
				navigator,
				reader: reader ?? UNREADABLE,
				host: host ?? NO_HOST,
				content: here.content,
			}),
		),
		menu,
	]);
}

export function passageHere({ app, sourcePath, rawLines, rule, content, section }) {
	const spelled = renderSpan(rule, content) !== null;
	const located = section ? findLines(section.text.split("\n"), rawLines, section.lineStart, section.lineEnd + 1) : -1;

	return {
		of: "passage",
		content,
		canUpdate: spelled && located >= 0,
		async get() {
			const file = app.vault.getAbstractFileByPath(sourcePath);
			const props = file ? { ...(app.metadataCache.getFileCache(file)?.frontmatter ?? {}) } : {};
			return { of: "passage", path: sourcePath, props, content };
		},
		async update(next) {
			const lines = renderSpan(rule, next);
			const file = app.vault.getAbstractFileByPath(sourcePath);
			if (!lines || !file || located < 0) return false;
			await app.vault.process(file, (text) => {
				const all = text.split("\n");
				const locatedInsideTheWrite = findLines(all, rawLines);
				if (locatedInsideTheWrite < 0) return text;
				return replaceLines(all, locatedInsideTheWrite, rawLines.length, lines).join("\n");
			});
			return true;
		},
	};
}

export function passageReader(reader, writtenInThePassage) {
	return {
		canRead: Boolean(reader?.canRead),
		async read(link, options) {
			const named = String(link ?? "").trim();
			if (!named || !writtenInThePassage.includes(named))
				return refuseRead(`${named || "that file"} is not named here`);
			return reader.read(named, options);
		},
	};
}

export function substituteIn({ element, context, rules, registry, app, host }) {
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
	const blocks = blocksAtOrUnder(element, BLOCK_SELECTOR);
	const tools = {
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
	for (const block of blocks) {
		if (!block.isConnected) {
			traceSub("block skipped", () => ({ block: elementOf(block), why: "not connected" }));
			continue;
		}
		const guard = block.closest(GUARDED);
		if (guard) {
			traceSub("block skipped", () => ({ block: elementOf(block), why: `inside ${guardName(guard)}` }));
			continue;
		}
		seen += 1;
		drawn += substituteBlock(block, rules, tools);
	}
	traceSub("process done", { path: tools.sourcePath, seen, drawn });
	return drawn;
}

function blocksAtOrUnder(element, selector) {
	const found = [...element.querySelectorAll(selector)];
	return element.matches?.(selector) ? [element, ...found] : found;
}

function lineGroupsOf(block) {
	const groups = [[]];
	for (const node of [...block.childNodes]) {
		if (node.nodeName === "BR") {
			groups.push([]);
			continue;
		}
		groups[groups.length - 1].push(node);
	}
	return groups;
}

function textOf(group) {
	return group.map((node) => node.textContent ?? "").join("");
}

function textUnlessQuotedAsCode(group) {
	const lead = group.find((node) => node.nodeType !== 3 || (node.textContent ?? "").trim() !== "");
	return lead?.nodeName === "CODE" ? "" : textOf(group);
}

function clippedForTheLog(text) {
	const one = String(text ?? "")
		.replace(/\s+/g, " ")
		.trim();
	return one.length > CLIP_CHARS ? `${one.slice(0, CLIP_CHARS)}…` : one;
}

function elementOf(node) {
	const name = String(node?.tagName ?? "?").toLowerCase();
	const classes = String(node?.className ?? "").trim();
	return classes ? `${name}.${classes.split(/\s+/).join(".")}` : name;
}

function guardName(node) {
	return GUARDS.find((one) => node.matches(one)) ?? elementOf(node);
}

function hostFor(span, rawLines, tools) {
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

function unmountWhenTheNoteCloses(node, context) {
	const child = new MarkdownRenderChild(node);
	child.onunload = () => render(null, node);
	context.addChild(child);
}

function substituteBlock(block, rules, tools) {
	const groups = lineGroupsOf(block);
	const lines = groups.map(textOf);
	const probes = groups.map(textUnlessQuotedAsCode);
	const spans = matchLines(probes, rules);
	traceSub("block considered", () => ({
		block: elementOf(block),
		tested: probes.map(clippedForTheLog),
		matched: spans.map((span) => `${span.rule.id} → ${span.rule.widget}`),
	}));
	if (spans.length === 0) {
		traceSub("block done", { made: 0 });
		return 0;
	}

	tools.section = tools.context.getSectionInfo?.(block) ?? null;
	const rawOf = (span) => lines.slice(span.from, span.to + 1);
	const whole = spans.length === 1 && spans[0].from === 0 && spans[0].to === groups.length - 1;
	if (whole) {
		const drawn = hostFor(spans[0], rawOf(spans[0]), tools);
		const belongsToReadingView = block === tools.element;
		if (belongsToReadingView) block.replaceChildren(drawn);
		else block.replaceWith(drawn);
		traceSub("block done", { made: 1, how: belongsToReadingView ? "whole block filled" : "whole block replaced" });
		return 1;
	}

	const next = tools.doc.createDocumentFragment();
	let at = 0;
	while (at < groups.length) {
		const span = spans.find((entry) => entry.from === at);
		if (span) {
			next.appendChild(hostFor(span, rawOf(span), tools));
			at = span.to + 1;
			continue;
		}
		for (const node of groups[at]) next.appendChild(node);
		if (at < groups.length - 1) next.appendChild(tools.doc.createElement("br"));
		at += 1;
	}
	block.replaceChildren(next);
	traceSub("block done", { made: spans.length, how: "lines spliced" });
	return spans.length;
}
