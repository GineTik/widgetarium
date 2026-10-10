import { createElement as h } from "react";
import type { ReactElement } from "react";

export interface CallDetailProps {
	readonly label: string;
	readonly said: string;
}

export function CallDetail({ label, said }: CallDetailProps): ReactElement {
	return h("div", { className: "wg-studio-ai-call-part" }, [
		h("span", { className: "wg-studio-ai-call-part-label", key: "label" }, label),
		h("pre", { className: "wg-studio-ai-call-part-said", key: "said" }, said),
	]);
}
