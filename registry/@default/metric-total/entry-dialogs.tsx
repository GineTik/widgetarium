import type { RecordRef, Row } from "widgetarium";
import { AddDialog } from "./add-dialog";
import { folderSaid } from "./folder-said";
import { ListDialog } from "./list-dialog";
import { listedOf } from "./listed-of";
import type { Allowed } from "./types";
import type { useEntryDialog } from "./use-entry-dialog";
import type { MetricRecord } from "./widget";

type EntryDialogsProps = {
	entry: ReturnType<typeof useEntryDialog>;
	unit: string;
	today: string;
	kept: readonly Row<MetricRecord>[];
	undated: number;
	allowed: Allowed;
	onDelete: (ref: RecordRef) => void;
};

export function EntryDialogs({ entry, unit, today, kept, undated, allowed, onDelete }: EntryDialogsProps) {
	const close = () => entry.setAsked(null);
	return (
		<>
			{entry.asked === "add" ? (
				<AddDialog
					draft={entry.draft}
					unit={unit}
					today={today}
					onDraft={entry.setDraft}
					onClose={close}
					onConfirm={entry.confirmDraft}
				/>
			) : null}
			{entry.asked === "list" ? (
				<ListDialog
					listed={listedOf(kept, today)}
					count={kept.length}
					folder={folderSaid(kept[0]?.path)}
					undated={undated}
					allowed={allowed}
					onClose={close}
					onAdd={entry.openAdd}
					onEdit={entry.editRow}
					onDelete={onDelete}
				/>
			) : null}
		</>
	);
}
