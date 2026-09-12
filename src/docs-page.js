import { createElement as h } from "react";
import { useEffect, useRef } from "react";
import { Button, Icon } from "./kit.js";
import { pageAfter } from "./docs.js";

const NEXT = "Next";

function MarkdownBody({ body, host }) {
	const holder = useRef(null);

	useEffect(() => {
		const node = holder.current;
		if (!node || host?.can?.renderMarkdown !== true) return undefined;
		return host.ui.renderMarkdown(node, body);
	}, [body, host]);

	if (host?.can?.renderMarkdown !== true) return h("pre", { className: "wg-doc-plain" }, body);
	return h("div", { className: "wg-doc-body", ref: holder });
}

export function DocsPage({ page, host, onOpenPage }) {
	const next = pageAfter(page.id);
	return h("article", { className: "wg-doc" }, [
		h(MarkdownBody, { key: "body", body: page.body, host }),
		page.action
			? h(
					Button,
					{ key: "action", asChild: true, className: "wg-doc-action", variant: "accent", size: "m" },
					h("a", { href: page.action.href, target: "_blank", rel: "noopener" }, [
						h(Icon, { name: page.action.icon, key: "mark" }),
						h("span", { key: "said" }, page.action.label),
					]),
				)
			: null,
		next
			? h("button", { key: "next", type: "button", className: "wg-doc-next", onClick: () => onOpenPage?.(next.id) }, [
					h("span", { className: "wg-doc-next-said", key: "said" }, [
						h("span", { className: "wg-doc-next-lead", key: "lead" }, NEXT),
						h("span", { className: "wg-doc-next-name", key: "name" }, next.title),
					]),
					h(Icon, { name: "chevron", key: "mark" }),
				])
			: null,
		h("span", { className: "wg-doc-source", key: "source" }, `docs/catalogue/${page.id}.md`),
	]);
}
