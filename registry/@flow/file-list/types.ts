import { z, type Row, type Slot } from "widgetarium";
import type { FileChangeSchema } from "./widget";

type FileChangeRecord = z.infer<typeof FileChangeSchema>;

export type FileFace = {
	filePath: string | null;
	added: number | string | null;
	removed: number | string | null;
	change: string | null;
	from: string | null;
};

export type FileRow = Row<FileChangeRecord>;
export type FileSlot = Slot<{ getFile: FileFace }>;
export type Drawn = NonNullable<FileSlot>;
