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
	return h("span", { className: "wg-ai-target", title: note.path }, [
		h(Icon, { key: "mark", name: note.hasBoard ? "widget" : "pencil", size: 14 }),
		h("span", { className: "wg-ai-target-name", key: "name" }, noteNameOf(note.path)),
	]);
}

export function noteNameOf(path: string): string {
	return (path.split("/").at(-1) ?? path).replace(/\.md$/, "");
}
