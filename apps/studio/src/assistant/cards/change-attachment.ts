import { designPathOf } from "@widgetarium/core/app-design.js";
import { specPathOf } from "@widgetarium/core/app-spec.js";

export interface Attachment {
	readonly label: string;
	rewrite(said: string): string;
}

export type ChangedFile = "spec" | "design";

const CHANGING = "Changing the {app} {what}";
const CHANGE_ASKED = "Change the {what} at {path} as follows: {said}\nThen show the {what} again.";

export function changeAttachmentOf(app: string, what: ChangedFile): Attachment {
	const path = what === "spec" ? specPathOf(app) : designPathOf(app);
	return {
		label: CHANGING.replace("{app}", app).replace("{what}", what),
		rewrite: (said) => CHANGE_ASKED.replaceAll("{what}", what).replace("{path}", path).replace("{said}", said),
	};
}
