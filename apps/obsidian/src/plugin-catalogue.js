import { Notice } from "obsidian";
import { openCatalogue } from "@widgetarium/core/catalogue-dialog.js";
import { TEMPLATES, templateBoard, templateWidgets } from "@widgetarium/core/templates.js";
import { openSubstitutions } from "./substitution-dialog.js";
import { createBoardNote } from "./board-note.js";
import { drawable } from "./widget-offers.js";

const OFFERS_REFUSED = "Widgetarium: the widget catalogue could not be read — {reason}";
const INSTALLED_AT = "Widgetarium: installed {widget} at {commit}";
const INSTALLED_BESIDE =
	"Widgetarium: {widget} at {commit} changed what its tiles hold, so it was installed beside the version they use";
const INSTALL_AT_REFUSED = "Widgetarium: {widget} was not installed — {why}";

// TRADE-OFF: every offer is compiled to draw its card, so it waits for somebody to look
export async function offersOf(plugin) {
	try {
		plugin.available ??= (await plugin.installer.available()).map(drawable);
	} catch (failure) {
		console.error(failure);
		new Notice(OFFERS_REFUSED.replace("{reason}", String(failure?.message ?? failure)));
		plugin.available = [];
	}
	return plugin.available;
}

export async function openCatalogueAs(plugin, mode, folder) {
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

export async function showSubstitutions(plugin) {
	plugin.closeSubstitutions?.();
	plugin.closeSubstitutions = openSubstitutions({
		rules: plugin.rules,
		registry: plugin.registry,
		host: plugin.host,
		available: await plugin.offers(),
		onInstall: (entry) => installPinnedToItsCommit(plugin, entry),
		onChange: (next) => plugin.setRules(next),
		onClose: () => {
			plugin.closeSubstitutions = null;
		},
	});
}

export async function installAt(plugin, ref) {
	const done = await plugin.installer.installAt(ref, await plugin.offers());
	if (!done.ok) {
		new Notice(INSTALL_AT_REFUSED.replace("{widget}", ref).replace("{why}", done.failure));
		return done;
	}
	await plugin.rereadWidgets();
	return done;
}

async function installPinnedToItsCommit(plugin, entry, onStep) {
	const done = await plugin.installer.install(entry, onStep);
	if (!done.ok) return done;
	await plugin.rereadWidgets();
	const said = done.isNewGeneration ? INSTALLED_BESIDE : INSTALLED_AT;
	new Notice(said.replace("{widget}", entry.manifest.id).replace("{commit}", done.commit.slice(0, 7)));
	return done;
}

async function uninstall(plugin, id) {
	const done = await plugin.installer.uninstall(id);
	if (!done.ok) {
		new Notice(`Widgetarium: ${id} was not removed — ${done.failure}`);
		return done;
	}
	await plugin.rereadWidgets();
	new Notice(`Widgetarium: removed ${id}`);
	return done;
}

function templateBuilderInto(plugin, folder) {
	return async (template, onStep) => {
		const done = await useTemplate(plugin, template, folder, onStep);
		if (done.ok) plugin.catalogue?.close();
		return done;
	};
}

async function useTemplate(plugin, template, folder, onStep) {
	try {
		const fetched = await fetchWidgetsFor(plugin, template, onStep);
		if (!fetched.ok) return fetched;
		onStep?.(null);
		await createBoardNote(plugin.app, folder, { board: templateBoard(template), name: template.title });
		return { ok: true, failure: null };
	} catch (failure) {
		console.error(failure);
		return { ok: false, failure: String(failure?.message ?? failure) };
	}
}

// TRADE-OFF: the installer is driven directly rather than through install(), so a template standing on six widgets neither shows six notices nor rereads the registry six times
async function fetchWidgetsFor(plugin, template, onStep) {
	const named = templateWidgets(template);
	await plugin.wanted.want(named, onStep);
	const failure = named.map((id) => (plugin.registry.get(id) ? null : plugin.wanted.refusalOf(id))).find(Boolean);
	return failure ? { ok: false, failure } : { ok: true, failure: null };
}
