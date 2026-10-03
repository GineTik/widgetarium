import { z } from "zod";
import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { ICommand } from "@widgetarium/core/gateway/queries.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import {
	ClearAskedSchema,
	PlaceAskedSchema,
	TemplateAskedSchema,
	ViewAskedSchema,
	WidgetAskedSchema,
} from "./schemas.js";
import type { ClearFields, NoFields } from "./schemas.js";

const NOTHING_ASKED =
	"Nothing is waiting for a widget: drag the card onto a board, or press the add button at the end of a column first";
const NOT_PLACED = "{widget} was not placed: the spot it was dropped on is gone";
const UNINSTALL_ASKED = "Remove {widget} from this vault? Tiles that draw it will say it is not installed.";
const NOT_REMOVED = "{widget} was not removed";

export class InstallCommand extends ICommand.takes(WidgetAskedSchema) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async run({ widget }: z.output<typeof WidgetAskedSchema>): Promise<void> {
		const outcome = await this.ports.catalogue.install(widget);
		if (!outcome.ok) throw new Error(outcome.failure ?? widget);
	}
}

export class UninstallCommand extends ICommand.takes(WidgetAskedSchema) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async run({ widget }: z.output<typeof WidgetAskedSchema>): Promise<void> {
		if (!(await this.ports.confirm(UNINSTALL_ASKED.replace("{widget}", widget)))) return;
		const outcome = await this.ports.catalogue.uninstall(widget);
		if (!outcome.ok) throw new Error(outcome.failure ?? NOT_REMOVED.replace("{widget}", widget));
	}
}

export class PickCommand extends ICommand.takes(WidgetAskedSchema) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async run({ widget }: z.output<typeof WidgetAskedSchema>): Promise<void> {
		if (!this.ports.catalogue.requests.answer(widget)) throw new Error(NOTHING_ASKED);
		installWhenMissing(this.ports, widget);
	}
}

export class PlaceCommand extends ICommand.takes(PlaceAskedSchema) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async run({ widget, at }: z.output<typeof PlaceAskedSchema>): Promise<void> {
		if (!this.ports.catalogue.place(widget, at)) throw new Error(NOT_PLACED.replace("{widget}", widget));
		installWhenMissing(this.ports, widget);
	}
}

export class ApplyTemplateCommand extends ICommand.takes(TemplateAskedSchema) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async run({ template }: z.output<typeof TemplateAskedSchema>): Promise<void> {
		const outcome = await this.ports.catalogue.applyTemplate(template);
		if (!outcome.ok) throw new Error(outcome.failure ?? template);
	}
}

export class OpenViewCommand extends ICommand.takes(ViewAskedSchema) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async run({ view }: z.output<typeof ViewAskedSchema>): Promise<void> {
		this.ports.catalogue.openView(view);
	}
}

export class ClearFiltersCommand extends ICommand.takes(ClearAskedSchema) {
	constructor(
		private readonly fields: ClearFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async run(): Promise<void> {
		await Promise.all((this.fields.targets ?? []).map((ref) => clearRef(this.ports, ref)));
	}
}

// TRADE-OFF: a cleared text is "" and anything else null, because a search field's schema refuses null
async function clearRef(ports: ImplementationPorts, ref: string): Promise<void> {
	const verbs = ports.refs.get(ref);
	const update = isObject(verbs) ? verbs["update"] : undefined;
	if (typeof update !== "function") return;
	const now = await ports.refs.read(ref);
	await Reflect.apply(update, verbs, [typeof now === "string" ? "" : null]);
}

function installWhenMissing(ports: ImplementationPorts, widget: string): void {
	if (ports.catalogue.entryOf(widget)?.installed !== false) return;
	ports.catalogue
		.install(widget)
		.catch((failure: unknown) => console.error(`Widgetarium: ${widget} was not installed`, failure));
}
