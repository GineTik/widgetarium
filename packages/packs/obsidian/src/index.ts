import { z } from "zod";
import { definePack } from "@widgetarium/core/engine/packs.js";
import { defineCommandMetadata, defineGatewayMetadata } from "@widgetarium/core/gateway/implementation-metadata.js";
import { SearchFieldsSchema, SearchQuery, TagFieldsSchema, TagQuery } from "./note-list-queries.js";
import {
	FileFieldFieldsSchema,
	FileSetCommand,
	FolderCreateCommand,
	FolderFieldsSchema,
	FolderRemoveCommand,
	FolderUpdateCommand,
	OpenCommand,
} from "./vault-commands.js";
import { FileQuery, FolderQuery } from "./vault-queries.js";

export { READS_AS_IS, folderRows } from "./folder-rows.js";

export {
	FileQuery,
	FileSetCommand,
	FolderCreateCommand,
	FolderQuery,
	FolderRemoveCommand,
	FolderUpdateCommand,
	OpenCommand,
	SearchQuery,
	TagQuery,
};

const RowsReadSchema = {
	where: z.array(z.looseObject({})).optional(),
	sort: z.array(z.looseObject({})).optional(),
};

export const obsidianPack = definePack({
	id: "@obsidian",
	title: "Obsidian",
	queries: [
		defineGatewayMetadata(FileQuery, {
			id: "@obsidian/file",
			title: "Its content or a property",
			resource: "Note",
			description: "One note, or one property of it.",
			fields: z.looseObject({ path: z.string().optional(), field: z.string().optional() }),
		}),
		defineGatewayMetadata(FolderQuery, {
			id: "@obsidian/folder",
			title: "Notes in it",
			resource: "Folder",
			description: "Every note in a folder, one row per note.",
			fields: z.looseObject({
				path: z.string().optional(),
				map: z.record(z.string(), z.string()).optional(),
				...RowsReadSchema,
			}),
		}),
		defineGatewayMetadata(TagQuery, {
			id: "@obsidian/tag",
			title: "Notes with a tag",
			resource: "Search",
			description: "Every note carrying a tag, one row per note.",
			fields: TagFieldsSchema,
		}),
		defineGatewayMetadata(SearchQuery, {
			id: "@obsidian/search",
			title: "Notes matching words",
			resource: "Search",
			description: "Every note whose name or properties hold the words typed.",
			fields: SearchFieldsSchema,
		}),
	],
	commands: [
		defineCommandMetadata(FolderCreateCommand, {
			id: "@obsidian/folder-create",
			title: "Add a note",
			resource: "Folder",
			description: "Writes a new note into a folder.",
			fields: FolderFieldsSchema,
		}),
		defineCommandMetadata(FolderUpdateCommand, {
			id: "@obsidian/folder-update",
			title: "Change a note",
			resource: "Folder",
			description: "Merges properties into a note of a folder.",
			fields: FolderFieldsSchema,
		}),
		defineCommandMetadata(FolderRemoveCommand, {
			id: "@obsidian/folder-remove",
			title: "Move a note to the trash",
			resource: "Folder",
			description: "Moves a note of a folder to the trash; it is never deleted outright.",
			fields: FolderFieldsSchema,
		}),
		defineCommandMetadata(FileSetCommand, {
			id: "@obsidian/file-set",
			title: "Set a property",
			resource: "Note",
			description: "Writes one property of one note.",
			fields: FileFieldFieldsSchema,
		}),
		defineCommandMetadata(OpenCommand, {
			id: "@obsidian/open",
			title: "Open it",
			resource: "Note",
			description: "Opens the note sent in a pane.",
			fields: z.looseObject({}),
			consent: "free",
		}),
	],
});
