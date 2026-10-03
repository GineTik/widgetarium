import { createElement as h } from "react";
import type { ReactElement } from "react";

export function SpecTitle({ title, said }: { readonly title: string; readonly said: string | null }): ReactElement {
	return h("div", { className: "wg-ai-spec-title" }, [
		h("h3", { key: "title" }, title),
		said ? h("span", { key: "said" }, said) : null,
	]);
}
