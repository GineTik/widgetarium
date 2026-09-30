import { Notice } from "obsidian";
import type { TFolder } from "obsidian";
import { openCatalogue } from "@widgetarium/core/catalogue-dialog.js";
import { TEMPLATES, templateBoard, templateWidgets } from "@widgetarium/core/templates.js";
import type { Template } from "@widgetarium/core/templates.js";
import type { CatalogueDefinition } from "@widgetarium/core/catalogue-entries.js";
import type { CatalogueMode } from "@widgetarium/core/catalogue-install-press.js";
import type { OnUseTemplate, TemplateAnswer } from "@widgetarium/core/use-template-build.js";
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

export async function openCatalogueAs(plugin: WidgetariumPlugin, mode: CatalogueMode, folder?: TFolder): Promise<void> {
	plugin.catalogue?.close();
	plugin.catalogue = openCatalogue({
		registry: plugin.registry,
		host: plugin.host,
		mode,
		available: await plugin.offers(),
		templates: TEMPLATES,
		lock: await plugin.installer.lock(),
		onInstall: (entry, onStep) => installPinnedToItsCommit(plugin, entry, onStep),
		onUninstall: (id) => uninstall(plugin, id),
		onUseTemplate: templateBuilderInto(plugin, folder),
		onClose: () => {
			plugin.catalogue = null;
		},
	});
}

export async function showSubstitutions(plugin: WidgetariumPlugin): Promise<void> {
	plugin.closeSubstitutions?.();
	plugin.closeSubstitutions = openSubstitutions({
		rules: plugin.rules,
		registry: plugin.registry,
		host: plugin.host,
		available: await plugin.offers(),
		onInstall: (entry) => installPinnedToItsCommit(plugin, entry),
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

function messageOf(failure: unknown): string {
	return String(isObject(failure) ? (failure["message"] ?? failure) : failure);
}

async function installPinnedToItsCommit(
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

async function uninstall(plugin: WidgetariumPlugin, id: string): Promise<RemoveAnswer> {
	const done = await plugin.installer.uninstall(id);
	if (!done.ok) {
		new Notice(`Widgetarium: ${id} was not removed — ${done.failure}`);
		return done;
	}
	await plugin.rereadWidgets();
	new Notice(`Widgetarium: removed ${id}`);
	return done;
}

function templateBuilderInto(plugin: WidgetariumPlugin, folder: TFolder | undefined): OnUseTemplate {
	return async (template, onStep) => {
		const done = await useTemplate(plugin, template, folder, onStep);
		if (done.ok) plugin.catalogue?.close();
		return done;
	};
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
