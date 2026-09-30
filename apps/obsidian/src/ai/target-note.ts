import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { OpenNote } from "./assistant.js";

export interface TargetNoteProps {
	readonly note: OpenNote | null | undefined;
}

const NO_NOTE = "No note open";

export function TargetNote({ note }: TargetNoteProps): ReactElement {
	if (!note?.path) return h("span", { className: "wg-ai-target is-unset" }, NO_NOTE);
	return h("span", { className: "wg-ai-target" }, [
		h(Icon, { key: "mark", name: note.hasBoard ? "widget" : "pencil", size: 14 }),
		h("span", { className: "wg-ai-target-name", key: "name" }, note.path),
	]);
}
