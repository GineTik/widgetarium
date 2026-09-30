import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Icon } from "@widgetarium/kit";
import { pageAfter } from "./docs.js";
import type { DocPage } from "./docs.js";
import { MarkdownBody } from "./markdown-body.js";
import type { MarkdownHost } from "./markdown-body.js";

export interface DocsPageProps {
	readonly page: DocPage;
	readonly host: MarkdownHost | null | undefined;
	readonly onOpenPage?: ((id: string) => void) | undefined;
}

const NEXT = "Next";

export function DocsPage({ page, host, onOpenPage }: DocsPageProps): ReactElement {
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
