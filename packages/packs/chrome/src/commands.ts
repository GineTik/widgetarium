import type { z } from "zod";
import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { ICommand } from "@widgetarium/core/gateway/queries.js";
import { AppAskedSchema } from "./schemas.js";
import type { AppFields, NoFields } from "./schemas.js";

export class OpenAppCommand extends ICommand.input(AppAskedSchema) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	run({ id }: z.output<typeof AppAskedSchema>): Promise<void> {
		return this.ports.apps.open(id);
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
		return this.ports.apps.create();
	}
}

export class EditInCanvasCommand extends ICommand {
	constructor(
		private readonly fields: AppFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	run(): Promise<void> {
		return this.ports.apps.editInCanvas(this.fields.app);
	}
}

export class BackToViewCommand extends ICommand {
	constructor(
		private readonly fields: AppFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	run(): Promise<void> {
		return this.ports.apps.backToView(this.fields.app);
	}
}

export class ToggleAssistantCommand extends ICommand {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	run(): Promise<void> {
		return this.ports.apps.toggleAssistant();
	}
}
