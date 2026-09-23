import { createElement as h, useState } from "react";
import { render } from "@widgetarium/core/engine/render.js";
import { DialogClose, DialogContent, DialogOverlay } from "@widgetarium/core/dialog.js";
import { Button, Field, Icon, List, Row, RowLabel, RowValue, Switch } from "@widgetarium/kit";
import { CLI, HTTP, PLACEHOLDERS } from "./providers.js";
import { PUBLISH_WIDGETS, SKIP_PERMISSIONS } from "./switches.js";
import { changedFrom } from "./settings.js";
import { commandLineOf } from "./command.js";

const TITLE = "AI providers";
const LEAD =
	"Every provider here runs on this machine and costs nothing to use. Pick the one the sidebar talks to, and change how it is started if you need to.";
const IN_USE = "In use";
const CHAT_ONLY = "Chat only — this model cannot read or edit your vault.";
const EDITS = "Can read and edit your vault.";
const USE_THIS = "Use this one";
const RESET = "Reset to shipped";
const CHANGED = "Changed from shipped: {fields}";
const PREVIEW = "What gets run";
const PLACEHOLDER_HELP = `Placeholders: ${PLACEHOLDERS.join(" ")}`;

const CLI_FIELDS = [
	{ key: "command", label: "Command" },
	{ key: "args", label: "Arguments" },
	{ key: "model", label: "Model" },
	{ key: "modelArgs", label: "Model argument" },
	{ key: "resumeArgs", label: "Resume argument" },
	{ key: "bypassArgs", label: "Permission argument" },
	{ key: "outputFormat", label: "Output format" },
];

const HTTP_FIELDS = [
	{ key: "endpoint", label: "Endpoint" },
	{ key: "model", label: "Model" },
	{ key: "outputFormat", label: "Output format" },
];

const SAMPLE = {
	prompt: "Build me a kanban board",
	brief: "<brief>",
	vaultPath: "<vault>",
	pluginPath: "<plugin>",
	session: "",
};

function ProviderRows({ ai, editingId, onEdit }) {
	return h(
		List,
		{ className: "wg-ai-providers" },
		ai.providers.map((provider) =>
			h(
				Row,
				{
					key: provider.id,
					pressable: true,
					selected: provider.id === editingId,
					onClick: () => onEdit(provider.id),
				},
				[
					h(RowLabel, { key: "label" }, provider.label),
					provider.id === ai.chosen ? h(RowValue, { key: "value" }, IN_USE) : null,
					h(Icon, { key: "mark", name: "chevron" }),
				],
			),
		),
	);
}

function ProviderForm({ provider, onUpdate }) {
	const fields = provider.kind === HTTP ? HTTP_FIELDS : CLI_FIELDS;
	const [drafts, setDrafts] = useState({});
	const draftKey = (key) => `${provider.id}:${key}`;
	const fieldValue = (key) => drafts[draftKey(key)] ?? provider[key] ?? "";

	const commit = (key) => {
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
					onInput: (event) => setDrafts((held) => ({ ...held, [draftKey(field.key)]: event.target.value })),
					onBlur: () => commit(field.key),
				}),
			]),
		),
	);
}

function SettingToggle({ checked, onChange, label, hint }) {
	return h("div", { className: "wg-ai-choice" }, [
		h("div", { className: "wg-ai-choice-head", key: "head" }, [
			h(Switch, { key: "switch", checked, onChange, label }),
			h("span", { className: "wg-ai-choice-label", key: "label" }, label),
		]),
		h("p", { className: "wg-ai-choice-hint", key: "hint" }, hint),
	]);
}

function ProviderWindow({ ai, onChoose, onUpdate, onReset, onSkipPermissions, onPublishWidgets, onClose }) {
	const [editingId, setEditingId] = useState(ai.chosen);
	const provider = ai.providers.find((each) => each.id === editingId) ?? ai.provider;
	const changed = changedFrom(provider);

	return h(
		DialogOverlay,
		{ className: "wg-ai-over", onClose },
		h(DialogContent, { className: "wg-ai-window" }, [
			h(DialogClose, { key: "close", onClose }),
			h("h2", { className: "wg-ai-window-title", key: "title" }, TITLE),
			h("p", { className: "wg-ai-window-lead", key: "lead" }, LEAD),
			h(ProviderRows, { key: "rows", ai, editingId, onEdit: setEditingId }),
			h("div", { className: "wg-ai-pane", key: "pane" }, [
				h("p", { className: "wg-ai-kind", key: "kind" }, provider.canEdit ? EDITS : CHAT_ONLY),
				h(ProviderForm, { key: "form", provider, onUpdate }),
				provider.kind === CLI
					? h("div", { className: "wg-ai-preview", key: "preview" }, [
							h("span", { className: "wg-ai-preview-label", key: "label" }, PREVIEW),
							h(
								"code",
								{ className: "wg-ai-preview-said", key: "said" },
								commandLineOf(provider, { ...SAMPLE, skipPermissions: ai.skipPermissions }),
							),
							h("span", { className: "wg-ai-preview-help", key: "help" }, PLACEHOLDER_HELP),
						])
					: null,
				changed.length > 0
					? h("p", { className: "wg-ai-changed", key: "changed" }, CHANGED.replace("{fields}", changed.join(", ")))
					: null,
				h("div", { className: "wg-ai-actions", key: "actions" }, [
					provider.id === ai.chosen
						? null
						: h(Button, { key: "use", variant: "accent", size: "m", onClick: () => onChoose(provider.id) }, USE_THIS),
					changed.length === 0
						? null
						: h(Button, { key: "reset", variant: "ghost", size: "m", onClick: () => onReset(provider.id) }, RESET),
				]),
			]),
			h(SettingToggle, { key: "skip", checked: ai.skipPermissions, onChange: onSkipPermissions, ...SKIP_PERMISSIONS }),
			h(SettingToggle, { key: "publish", checked: ai.publishWidgets, onChange: onPublishWidgets, ...PUBLISH_WIDGETS }),
		]),
	);
}

export function openProviderWindow({
	read,
	onChoose,
	onUpdate,
	onReset,
	onSkipPermissions,
	onPublishWidgets,
	onClose,
}) {
	const node = document.createElement("div");
	const close = () => {
		render(null, node);
		onClose?.();
	};
	const draw = async () => {
		const ai = await read();
		render(
			h(ProviderWindow, {
				ai,
				onChoose: async (id) => {
					await onChoose(id);
					draw();
				},
				onUpdate: async (id, patch) => {
					await onUpdate(id, patch);
					draw();
				},
				onReset: async (id) => {
					await onReset(id);
					draw();
				},
				onSkipPermissions: async (on) => {
					await onSkipPermissions(on);
					draw();
				},
				onPublishWidgets: async (on) => {
					await onPublishWidgets(on);
					draw();
				},
				onClose: close,
			}),
			node,
		);
	};
	draw();
	return close;
}
