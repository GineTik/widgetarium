import { PluginSettingTab, Setting } from "obsidian";
import { PUBLISH_WIDGETS, SKIP_PERMISSIONS } from "./switches.js";

const HEADING = "Artificial intelligence";
const PROVIDER_NAME = "Provider";
const PROVIDER_DESC =
	"Which local agent the Widgetarium sidebar talks to. Every one of them runs on this machine and is free to use.";
const CONFIGURE = "Configure providers";
const OPEN_NAME = "Assistant sidebar";
const OPEN_DESC = "The panel where you ask for a screen and watch it get built.";
const OPEN = "Open the sidebar";
const READY = "{label} is ready.";
const NOT_READY = "{label} — {reason}";

export class WidgetariumSettingTab extends PluginSettingTab {
	constructor(app, plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		this.containerEl.empty();
		void this.draw();
	}

	async draw() {
		const holder = this.containerEl;
		const assistant = this.plugin.assistant;
		const ai = await assistant.state();

		new Setting(holder).setName(HEADING).setHeading();

		new Setting(holder)
			.setName(PROVIDER_NAME)
			.setDesc(
				`${PROVIDER_DESC} ${ai.ready ? READY.replace("{label}", ai.provider.label) : NOT_READY.replace("{label}", ai.provider.label).replace("{reason}", ai.reason)}`,
			)
			.addButton((button) =>
				button
					.setButtonText(CONFIGURE)
					.setCta()
					.onClick(() => assistant.openProviders()),
			);

		new Setting(holder)
			.setName(OPEN_NAME)
			.setDesc(OPEN_DESC)
			.addButton((button) => button.setButtonText(OPEN).onClick(() => this.plugin.showAssistant()));

		new Setting(holder)
			.setName(SKIP_PERMISSIONS.label)
			.setDesc(SKIP_PERMISSIONS.hint)
			.addToggle((toggle) =>
				toggle.setValue(ai.skipPermissions).onChange(async (on) => {
					await assistant.settings.setSkipPermissions(on);
				}),
			);

		new Setting(holder)
			.setName(PUBLISH_WIDGETS.label)
			.setDesc(PUBLISH_WIDGETS.hint)
			.addToggle((toggle) =>
				toggle.setValue(ai.publishWidgets).onChange(async (on) => {
					await assistant.settings.setPublishWidgets(on);
				}),
			);
	}
}
