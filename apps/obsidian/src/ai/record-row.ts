import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Row } from "@widgetarium/kit";
import { RECORD_VERBS } from "@widgetarium/core/app-spec.js";
import type { AppSpec, RecordVerb } from "@widgetarium/core/app-spec.js";
import { rowText } from "./spec-rows.js";

export interface RecordRowProps {
	readonly record: AppSpec["records"][number];
	readonly isLocked: boolean;
	readonly onToggle: (verb: RecordVerb) => void;
}

const VERB_LABEL: Readonly<Record<RecordVerb, string>> = { create: "Add", update: "Edit", remove: "Delete" };
const CANNOT = "Cannot {verbs}";
const CAN_ALL = "Add, edit and delete";

export function RecordRow({ record, isLocked, onToggle }: RecordRowProps): ReactElement {
	const buttons = RECORD_VERBS.map((verb) => {
		const isOn = record.can.includes(verb);
		const look = { size: "s", variant: isOn ? "accent" : "neutral" } as const;
		const press = { "aria-pressed": isOn, disabled: isLocked, onClick: () => onToggle(verb) };
		return h(Button, { key: verb, ...look, ...press }, VERB_LABEL[verb]);
	});
	return h(Row, { className: "wg-ai-spec-record" }, [
		rowText(record.name, cannotSaid(record.can)),
		h("span", { key: "verbs", className: "wg-ai-spec-verbs" }, buttons),
	]);
}

function cannotSaid(can: readonly RecordVerb[]): string {
	const missing = RECORD_VERBS.filter((verb) => !can.includes(verb)).map((verb) => VERB_LABEL[verb].toLowerCase());
	return missing.length === 0 ? CAN_ALL : CANNOT.replace("{verbs}", missing.join(", "));
}
