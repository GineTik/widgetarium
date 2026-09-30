import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { TemplateBuildState } from "./use-template-build.js";

export type TemplateNoteProps = TemplateBuildState;

const INSTALLING = "Installing {widget}…";
const WRITING = "Writing the page…";

export function TemplateNote({ isBusy, step, failure }: TemplateNoteProps): ReactElement | null {
	if (isBusy) return h("p", { className: "wg-tpl-step" }, step ? INSTALLING.replace("{widget}", step) : WRITING);
	if (failure) return h("p", { className: "wg-cat-lack is-failure" }, failure);
	return null;
}
