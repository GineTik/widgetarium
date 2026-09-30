import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { render } from "@widgetarium/core/engine/render.js";
import { DialogClose, DialogContent, DialogOverlay } from "@widgetarium/core/dialog.js";
import { Button } from "@widgetarium/kit";
import { CLI, PLACEHOLDERS } from "./providers.js";
import { PUBLISH_WIDGETS, SKIP_PERMISSIONS } from "./switches.js";
import { changedFrom } from "./settings.js";
import type { AiState, ProviderFields } from "./settings.js";
import { commandLineOf } from "./command.js";
import { ProviderRows } from "./provider-rows.js";
import { ProviderForm } from "./provider-form.js";
import { SettingToggle } from "./setting-toggle.js";

export interface ProviderWindowAnswers {
	readonly onChoose: (id: string) => void;
	readonly onUpdate: (id: string, patch: ProviderFields) => void;
	readonly onReset: (id: string) => void;
	readonly onSkipPermissions: (on: boolean) => void;
	readonly onPublishWidgets: (on: boolean) => void;
	readonly onClose: () => void;
}

export interface ProviderWindowProps extends ProviderWindowAnswers {
	readonly ai: AiState;
}

export interface ProviderWindowAsk {
	readonly read: () => Promise<AiState>;
	readonly onChoose: (id: string) => Promise<unknown>;
	readonly onUpdate: (id: string, patch: ProviderFields) => Promise<unknown>;
	readonly onReset: (id: string) => Promise<unknown>;
	readonly onSkipPermissions: (on: boolean) => Promise<unknown>;
	readonly onPublishWidgets: (on: boolean) => Promise<unknown>;
	readonly onClose?: () => void;
}

const TITLE = "AI providers";
const LEAD =
	"Every provider here runs on this machine and costs nothing to use. Pick the one the sidebar talks to, and change how it is started if you need to.";
const CHAT_ONLY = "Chat only — this model cannot read or edit your vault.";
const EDITS = "Can read and edit your vault.";
const USE_THIS = "Use this one";
const RESET = "Reset to shipped";
const CHANGED = "Changed from shipped: {fields}";
const PREVIEW = "What gets run";
const PLACEHOLDER_HELP = `Placeholders: ${PLACEHOLDERS.join(" ")}`;

const SAMPLE = {
	prompt: "Build me a kanban board",
	brief: "<brief>",
	vaultPath: "<vault>",
	pluginPath: "<plugin>",
	session: "",
};

export function ProviderWindow(props: ProviderWindowProps): ReactElement {
	const { ai, onChoose, onReset, onSkipPermissions, onPublishWidgets, onClose } = props;
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
			h(ProviderRows, { key: "rows", ai, onEdit: setEditingId }),
			h("div", { className: "wg-ai-pane", key: "pane" }, [
				h("p", { className: "wg-ai-kind", key: "kind" }, provider.canEdit ? EDITS : CHAT_ONLY),
				h(ProviderForm, { key: "form", provider, onUpdate: props.onUpdate }),
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

export function openProviderWindow(ask: ProviderWindowAsk): () => void {
	const node = document.createElement("div");
	const close = (): void => {
		render(null, node);
		ask.onClose?.();
	};
	const thenRedraw =
		<Given extends unknown[]>(answer: (...given: Given) => Promise<unknown>) =>
		async (...given: Given): Promise<void> => {
			await answer(...given);
			void draw();
		};
	const draw = async (): Promise<void> => {
		const ai = await ask.read();
		render(
			h(ProviderWindow, {
				ai,
				onChoose: thenRedraw(ask.onChoose),
				onUpdate: thenRedraw(ask.onUpdate),
				onReset: thenRedraw(ask.onReset),
				onSkipPermissions: thenRedraw(ask.onSkipPermissions),
				onPublishWidgets: thenRedraw(ask.onPublishWidgets),
				onClose: close,
			}),
			node,
		);
	};
	void draw();
	return close;
}
