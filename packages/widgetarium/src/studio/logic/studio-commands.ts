import type { z } from "zod";
import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { ICommand } from "@widgetarium/core/gateway/queries.js";
import { AppAskedSchema } from "../shared/studio-app.js";
import { STUDIO_STATE } from "../studio-state.js";
import type { NoFields } from "./studio-fields.js";

export class OpenAppCommand extends ICommand.input(AppAskedSchema) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	run({ id }: z.output<typeof AppAskedSchema>): Promise<void> {
		return this.ports.studio.openApp(id);
	}
}

export class CreateAppCommand extends ICommand {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	run(): Promise<void> {
		return this.ports.studio.createApp();
	}
}

export class EditInCanvasCommand extends ICommand {
	constructor(readonly fields: NoFields) {
		super();
	}

	async run(): Promise<void> {
		STUDIO_STATE.show("canvas");
	}
}

export class BackToViewCommand extends ICommand {
	constructor(readonly fields: NoFields) {
		super();
	}

	async run(): Promise<void> {
		STUDIO_STATE.show("app");
	}
}

export class ToggleAssistantCommand extends ICommand {
	constructor(readonly fields: NoFields) {
		super();
	}

	async run(): Promise<void> {
		STUDIO_STATE.toggleAssistant();
	}
}
