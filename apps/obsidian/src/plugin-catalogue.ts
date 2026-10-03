import { Notice } from "obsidian";
import type { TFolder } from "obsidian";
import { TEMPLATES, templateBoard, templateWidgets } from "@widgetarium/core/templates.js";
import type { InstallOutcome } from "@widgetarium/core/engine/install-jobs.js";
import type { Template, TemplateAnswer } from "@widgetarium/core/templates.js";
import type { CatalogueDefinition } from "@widgetarium/core/catalogue-entries.js";
import type { OnFetchStep } from "@widgetarium/core/engine/widget-source.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { openSubstitutions } from "./substitution-dialog.js";
import { createBoardNote } from "./board-note.js";
import { drawable } from "./widget-offers.js";
import type { Drawn, Installer } from "./widget-offers.js";
import type WidgetariumPlugin from "./main.js";

export type AvailableOffer = Awaited<ReturnType<Installer["available"]>>[number];
export type InstallAtAnswer = Awaited<ReturnType<Installer["installAt"]>>;
type InstallAnswer = Awaited<ReturnType<Installer["install"]>>;
type RemoveAnswer = Awaited<ReturnType<Installer["uninstall"]>>;

const OFFERS_REFUSED = "Widgetarium: the widget catalogue could not be read — {reason}";
const INSTALLED_AT = "Widgetarium: installed {widget} at {commit}";
const INSTALLED_BESIDE =
	"Widgetarium: {widget} at {commit} changed what its tiles hold, so it was installed beside the version they use";
const INSTALL_AT_REFUSED = "Widgetarium: {widget} was not installed — {why}";
const NOT_REMOVED = "Widgetarium: {widget} was not removed — {why}";
const REMOVED = "Widgetarium: removed {widget}";
const NO_TEMPLATE = "no template is named {template}";

// TRADE-OFF: every offer is compiled to draw its card, so it waits for somebody to look
export async function offersOf(plugin: WidgetariumPlugin): Promise<Drawn<AvailableOffer>[]> {
	try {
		plugin.available ??= (await plugin.installer.available()).map((entry) => drawable(entry));
	} catch (failure) {
		console.error(failure);
		new Notice(OFFERS_REFUSED.replace("{reason}", messageOf(failure)));
		plugin.available = [];
	}
	return plugin.available;
}

export async function showSubstitutions(plugin: WidgetariumPlugin): Promise<void> {
	plugin.closeSubstitutions?.();
	plugin.closeSubstitutions = openSubstitutions({
		rules: plugin.rules,
		registry: plugin.registry,
		host: plugin.host,
		onChange: (next) => void plugin.setRules(next),
		onClose: () => {
			plugin.closeSubstitutions = null;
		},
	});
}

export async function installAt(plugin: WidgetariumPlugin, ref: string): Promise<InstallAtAnswer> {
	const done = await plugin.installer.installAt(ref, await plugin.offers());
	if (!done.ok) {
		new Notice(INSTALL_AT_REFUSED.replace("{widget}", ref).replace("{why}", done.failure));
		return done;
	}
	await plugin.rereadWidgets();
	return done;
}

export async function installPinnedToItsCommit(
	plugin: WidgetariumPlugin,
	entry: CatalogueDefinition,
	onStep?: OnFetchStep,
): Promise<InstallAnswer> {
	const done = await plugin.installer.install(entry, onStep);
	if (!done.ok) return done;
	await plugin.rereadWidgets();
	const said = done.isNewGeneration ? INSTALLED_BESIDE : INSTALLED_AT;
	const id = String(isObject(entry.manifest) ? entry.manifest["id"] : undefined);
	new Notice(said.replace("{widget}", id).replace("{commit}", done.commit.slice(0, 7)));
	return done;
}

export async function uninstall(plugin: WidgetariumPlugin, id: string): Promise<InstallOutcome> {
	const done: RemoveAnswer = await plugin.installer.uninstall(id);
	if (!done.ok) {
		new Notice(NOT_REMOVED.replace("{widget}", id).replace("{why}", done.failure));
		return { ok: false, failure: done.failure };
	}
	await plugin.rereadWidgets();
	new Notice(REMOVED.replace("{widget}", id));
	return { ok: true };
}

export async function useTemplateNamed(plugin: WidgetariumPlugin, id: string): Promise<InstallOutcome> {
	const template = TEMPLATES.find((held) => held.id === id);
	if (!template) return { ok: false, failure: NO_TEMPLATE.replace("{template}", id) };
	const folder = plugin.templateFolder;
	plugin.templateFolder = undefined;
	const done = await useTemplate(plugin, template, folder, () => undefined);
	return done.ok ? { ok: true } : { ok: false, failure: done.failure };
}

function messageOf(failure: unknown): string {
	return String(isObject(failure) ? (failure["message"] ?? failure) : failure);
}

async function useTemplate(
	plugin: WidgetariumPlugin,
	template: Template,
	folder: TFolder | undefined,
	onStep: (step: string | null) => void,
): Promise<TemplateAnswer> {
	try {
		const fetched = await fetchWidgetsFor(plugin, template, onStep);
		if (!fetched.ok) return fetched;
		onStep?.(null);
		await createBoardNote(plugin.app, folder, { board: templateBoard(template), name: template.title });
		return { ok: true, failure: null };
	} catch (failure) {
		console.error(failure);
		return { ok: false, failure: messageOf(failure) };
	}
}

// TRADE-OFF: the installer is driven directly rather than through install(), so a template standing on six widgets neither shows six notices nor rereads the registry six times
async function fetchWidgetsFor(
	plugin: WidgetariumPlugin,
	template: Template,
	onStep: (step: string | null) => void,
): Promise<TemplateAnswer> {
	const named = templateWidgets(template);
	await plugin.wanted.want(named, onStep);
	const failure = named.map((id) => (plugin.registry.get(id) ? null : plugin.wanted.refusalOf(id))).find(Boolean);
	return failure ? { ok: false, failure } : { ok: true, failure: null };
}
