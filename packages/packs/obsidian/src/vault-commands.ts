import { z } from "zod";
import { ICommand } from "@widgetarium/core/gateway/queries.js";
import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";

export const FolderFieldsSchema = z.object({ path: z.string().optional() });
export const FileFieldFieldsSchema = z.object({ path: z.string().optional(), field: z.string().optional() });

export type FolderFields = z.infer<typeof FolderFieldsSchema>;
export type FileFieldFields = z.infer<typeof FileFieldFieldsSchema>;

const NoteDraftSchema = z.looseObject({ name: z.string().optional(), body: z.string().optional() });
const NotePatchSchema = z.looseObject({ ref: z.string() });
const NoteAddressSchema = z.looseObject({ ref: z.string() });

const NO_FOLDER = "no folder: type its path in the settings window";
const NO_FILE = "no note: type its path in the settings window";
const NO_FIELD = "no property: type its name in the settings window";
const CANNOT = "{path} cannot {verb}";

export class FolderCreateCommand extends ICommand.takes(NoteDraftSchema) {
	constructor(
		readonly fields: FolderFields,
		readonly ports: ImplementationPorts,
	) {
		super();
	}

	async run(sent: z.output<typeof NoteDraftSchema>): Promise<void> {
		const { name, body, ...props } = sent;
		const slot = this.ports.vault.folder(folderIn(this.fields));
		if (!slot.create) throw new Error(CANNOT.replace("{path}", folderIn(this.fields)).replace("{verb}", "create"));
		await slot.create({ name, props, body });
	}
}

export class FolderUpdateCommand extends ICommand.takes(NotePatchSchema) {
	constructor(
		readonly fields: FolderFields,
		readonly ports: ImplementationPorts,
	) {
		super();
	}

	async run(sent: z.output<typeof NotePatchSchema>): Promise<void> {
		const { ref, body, ...props } = sent;
		const slot = this.ports.vault.folder(folderIn(this.fields));
		if (!slot.update) throw new Error(CANNOT.replace("{path}", folderIn(this.fields)).replace("{verb}", "update"));
		await slot.update({ path: ref }, body === undefined ? { props } : { props, body });
	}
}

export class FolderRemoveCommand extends ICommand.takes(NoteAddressSchema) {
	constructor(
		readonly fields: FolderFields,
		readonly ports: ImplementationPorts,
	) {
		super();
	}

	async run(sent: z.output<typeof NoteAddressSchema>): Promise<void> {
		const slot = this.ports.vault.folder(folderIn(this.fields));
		if (!slot.remove) throw new Error(CANNOT.replace("{path}", folderIn(this.fields)).replace("{verb}", "remove"));
		await slot.remove({ path: sent.ref });
	}
}

export class FileSetCommand extends ICommand.takes(z.unknown()) {
	constructor(
		readonly fields: FileFieldFields,
		readonly ports: ImplementationPorts,
	) {
		super();
	}

	async run(sent: unknown): Promise<void> {
		const path = this.fields.path?.trim() ?? "";
		const field = this.fields.field?.trim() ?? "";
		if (path === "") throw new Error(NO_FILE);
		if (field === "") throw new Error(NO_FIELD);
		const slot = this.ports.vault.folder(path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "");
		if (!slot.update) throw new Error(CANNOT.replace("{path}", path).replace("{verb}", "update"));
		await slot.update({ path }, { props: { [field]: sent } });
	}
}

export class OpenCommand extends ICommand.takes(z.union([z.looseObject({ ref: z.string() }), z.string()])) {
	constructor(
		readonly fields: object,
		readonly ports: ImplementationPorts,
	) {
		super();
	}

	run(sent: { ref: string } | string): void {
		this.ports.vault.open(typeof sent === "string" ? sent : sent.ref);
	}
}

function folderIn(fields: FolderFields): string {
	const path = fields.path?.trim() ?? "";
	if (path === "") throw new Error(NO_FOLDER);
	return path;
}
