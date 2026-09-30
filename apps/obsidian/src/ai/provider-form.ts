import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { Field } from "@widgetarium/kit";
import { HTTP } from "./providers.js";
import type { EditableField, Provider } from "./providers.js";
import type { ProviderFields } from "./settings.js";

export interface ProviderFormProps {
	readonly provider: Provider;
	readonly onUpdate: (id: string, patch: ProviderFields) => void;
}

interface FormField {
	readonly key: EditableField;
	readonly label: string;
}

const CLI_FIELDS: readonly FormField[] = [
	{ key: "command", label: "Command" },
	{ key: "args", label: "Arguments" },
	{ key: "model", label: "Model" },
	{ key: "modelArgs", label: "Model argument" },
	{ key: "resumeArgs", label: "Resume argument" },
	{ key: "bypassArgs", label: "Permission argument" },
	{ key: "outputFormat", label: "Output format" },
];

const HTTP_FIELDS: readonly FormField[] = [
	{ key: "endpoint", label: "Endpoint" },
	{ key: "model", label: "Model" },
	{ key: "outputFormat", label: "Output format" },
];

export function ProviderForm({ provider, onUpdate }: ProviderFormProps): ReactElement {
	const fields = provider.kind === HTTP ? HTTP_FIELDS : CLI_FIELDS;
	const [drafts, setDrafts] = useState<Readonly<Record<string, string>>>({});
	const draftKey = (key: EditableField): string => `${provider.id}:${key}`;
	const fieldValue = (key: EditableField): string => drafts[draftKey(key)] ?? provider[key] ?? "";

	const commit = (key: EditableField): void => {
		const held = drafts[draftKey(key)];
		if (held === undefined || held === provider[key]) return;
		onUpdate(provider.id, { [key]: held });
	};

	return h(
		"div",
		{ className: "wg-ai-form" },
		fields.map((field) =>
			h("label", { className: "wg-ai-field", key: field.key }, [
				h("span", { className: "wg-ai-field-label", key: "label" }, field.label),
				h(Field, {
					key: "box",
					block: true,
					value: fieldValue(field.key),
					onValueChange: (value: string) => setDrafts((held) => ({ ...held, [draftKey(field.key)]: value })),
					onBlur: () => commit(field.key),
				}),
			]),
		),
	);
}
