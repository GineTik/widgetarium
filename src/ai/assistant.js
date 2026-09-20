import { Platform } from "obsidian";
import { bindNote } from "../host.js";
import { WIDGETS_DIR } from "../paths.js";
import { BLOCK_LANGUAGE, FENCE } from "../block-writer.js";
import { createAiSettings } from "./settings.js";
import { createRunner } from "./run.js";
import { createSession } from "./session.js";
import { briefFor } from "./brief.js";
import { openProviderWindow } from "./provider-window.js";
import { HANDBOOK_DIR, TOOL_PATH, layAgentFiles } from "./agent-files.js";
import { whereCommandIs } from "./path.js";
import { HTTP } from "./providers.js";

const NOT_INSTALLED = "{command} was not found on this machine.";
const NO_COMMAND = "This provider has no command yet.";
const READY = { ready: true, reason: null };

function nodeDoors() {
	if (!Platform.isDesktopApp || typeof require !== "function")
		return { spawn: null, killGroup: null, exists: null, env: {} };
	const { spawn } = require("node:child_process");
	const fs = require("node:fs/promises");
	return {
		spawn,
		killGroup: (group, signal) => process.kill(group, signal),
		exists: (at) =>
			fs.access(at).then(
				() => true,
				() => false,
			),
		env: process.env,
	};
}

function basePathOf(app) {
	return app.vault.adapter.getBasePath?.() ?? "";
}

export function createAssistant(app, plugin) {
	const doors = nodeDoors();
	const vaultPath = basePathOf(app);
	const pluginPath = `${vaultPath}/${app.vault.configDir}/plugins/${plugin.manifest.id}`;

	const settings = createAiSettings({
		read: () => plugin.loadData(),
		write: (next) => plugin.saveData(next),
	});

	const runner = createRunner({
		spawn: doors.spawn,
		killGroup: doors.killGroup,
		fetchStream: (url, init) => fetch(url, init),
		vaultPath,
		pluginPath,
		env: doors.env,
	});

	async function noteNow() {
		const file = app.workspace.getActiveFile();
		if (!file) return null;
		const text = await app.vault.cachedRead(file);
		return { path: file.path, hasBoard: text.includes(`${FENCE}${BLOCK_LANGUAGE}`) };
	}

	async function briefNow() {
		const held = await settings.state();
		return briefFor({
			paths: {
				vault: vaultPath,
				plugin: pluginPath,
				widgets: `${vaultPath}/${WIDGETS_DIR}`,
				handbook: `${vaultPath}/${HANDBOOK_DIR}`,
				tool: `${vaultPath}/${TOOL_PATH}`,
			},
			note: await noteNow(),
			publishWidgets: held.publishWidgets,
			canEdit: held.provider?.canEdit !== false,
		});
	}

	const session = createSession({ settings, runner, briefNow });

	let boundTo = null;
	let boundHost = plugin.host;
	function hostFor(notePath) {
		if (boundTo === notePath) return boundHost;
		boundTo = notePath;
		boundHost = notePath ? bindNote(plugin.host, notePath) : plugin.host;
		return boundHost;
	}

	async function readinessOf(provider) {
		if (provider.kind === HTTP) return READY;
		if (String(provider.command ?? "").trim() === "") return { ready: false, reason: NO_COMMAND };
		const notHere = { ready: false, reason: NOT_INSTALLED.replace("{command}", provider.command) };
		if (!doors.exists) return notHere;
		return (await whereCommandIs(provider.command, { exists: doors.exists, env: doors.env })) ? READY : notHere;
	}

	async function state() {
		const held = await settings.state();
		const note = await noteNow();
		return { ...held, ...(await readinessOf(held.provider)), note, host: hostFor(note?.path ?? "") };
	}

	let closeWindow = null;

	return {
		session,
		settings,
		state,

		layAgentFiles: () => layAgentFiles(app.vault.adapter),

		restore: () => session.restore(),

		forgetContext: () => session.clear(),

		openProviders() {
			closeWindow?.();
			closeWindow = openProviderWindow({
				read: state,
				onChoose: (id) => settings.choose(id),
				onUpdate: (id, patch) => settings.update(id, patch),
				onReset: (id) => settings.reset(id),
				onSkipPermissions: (on) => settings.setSkipPermissions(on),
				onPublishWidgets: (on) => settings.setPublishWidgets(on),
				onClose: () => {
					closeWindow = null;
					plugin.redrawAssistant?.();
				},
			});
		},

		close() {
			session.stop();
			closeWindow?.();
			closeWindow = null;
		},
	};
}
