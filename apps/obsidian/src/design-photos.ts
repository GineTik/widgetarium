import type { DataAdapter } from "obsidian";
import {
	REFERENCES_FOLDER,
	designFolderOf,
	designPathOf,
	referenceFileOf,
	referencePathOf,
	withReferencesAdded,
} from "@widgetarium/core/app-design.js";

export type PhotoAdapter = Pick<DataAdapter, "exists" | "mkdir" | "writeBinary" | "read" | "write" | "process">;

export function imageFilesIn(list: FileList | null | undefined): File[] {
	return [...(list ?? [])].filter((file) => file.type.startsWith("image/"));
}

export async function addPhotos(adapter: PhotoAdapter, app: string, photos: readonly File[]): Promise<void> {
	if (photos.length === 0) return;
	const folder = `${designFolderOf(app)}/${REFERENCES_FOLDER}`;
	if (!(await adapter.exists(folder))) await adapter.mkdir(folder);
	const stamp = Date.now().toString(36);
	const files = photos.map((photo, index) => referenceFileOf(photo.name || `pasted-${index}.png`, `${stamp}${index}`));
	await Promise.all(
		photos.map(async (photo, index) =>
			adapter.writeBinary(referencePathOf(app, files[index] ?? ""), await photo.arrayBuffer()),
		),
	);
	const canvas = designPathOf(app);
	if (await adapter.exists(canvas))
		await adapter.process(canvas, (text) =>
			withReferencesAdded(
				text,
				files.map((file) => ({ file })),
			),
		);
	else
		await adapter.write(
			canvas,
			withReferencesAdded(
				null,
				files.map((file) => ({ file })),
			),
		);
}
