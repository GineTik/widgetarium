import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	type RecordRef,
} from "widgetarium";
import { Button, List } from "widgetarium/kit";
import { CloseButton } from "./close-button";
import { shortDaySaid } from "./days";
import { PLUS, signedOf } from "./numbers";
import { RecordActions } from "./record-actions";
import { Stroked } from "./stroked";
import type { Allowed, Listed } from "./types";

type ListDialogProps = {
	listed: Listed[];
	count: number;
	folder: string;
	undated: number;
	allowed: Allowed;
	onClose: () => void;
	onAdd: () => void;
	onEdit: (row: Listed) => void;
	onDelete: (ref: RecordRef) => void;
};

const WARN_TRIANGLE = "M10 3.6L17 16H3z";
const WARN_MARK = "M10 8.4v3.2M10 13.6v0.4";

const LIST_TITLE = "All records";
const LIST_DESC = "Newest first. Editing one redraws the card behind this window.";

export function ListDialog({
	listed,
	count,
	folder,
	undated,
	allowed,
	onClose,
	onAdd,
	onEdit,
	onDelete,
}: ListDialogProps) {
	const downAt = listed.findIndex((row) => row.amount < 0);
	return (
		<Dialog isOpen onClose={onClose}>
			<DialogContent className="mt3-list-dialog">
				<CloseButton name="list" onClose={onClose} />
				<DialogHeader data-part="list-head">
					<DialogTitle data-part="list-title">{LIST_TITLE}</DialogTitle>
					<DialogDescription data-part="list-desc">{LIST_DESC}</DialogDescription>
				</DialogHeader>
				<List data-part="records">
					{listed.map((row, at) => (
						<div key={row.ref} data-part={rowPartOf(at, listed.length)} className="mt3-record">
							<span data-part="record-date" className="mt3-record-date">
								{shortDaySaid(row.day)}
							</span>
							<span data-part="record-note" className="mt3-record-note">
								{row.note.length > 0 ? row.note : "—"}
							</span>
							<span
								data-part={amountPartOf(at, downAt)}
								className={`mt3-record-amount ${row.amount < 0 ? "is-down" : "is-up"}`}
							>
								{signedOf(row.amount)}
							</span>
							<RecordActions row={row} allowed={allowed} onEdit={onEdit} onDelete={onDelete} />
						</div>
					))}
				</List>
				{undated > 0 ? (
					<div data-part="undated" className="mt3-undated">
						<Stroked part="undated-icon" className="mt3-undated-icon" size={17} weight={1.7}>
							<path d={WARN_TRIANGLE} />
							<path d={WARN_MARK} />
						</Stroked>
						{undatedSaid(undated)}
					</div>
				) : null}
				<DialogFooter data-part="list-foot">
					<span data-part="list-count" className="mt3-list-count">
						{countSaid(count, folder)}
					</span>
					{allowed.canAdd ? (
						<Button size="s" variant="accent" className="mt3-btn mt3-list-add" data-part="list-add" onClick={onAdd}>
							<Stroked part="list-add-icon" className="mt3-list-add-icon" size={17} weight={2}>
								<path d={PLUS} />
							</Stroked>
							Add record
						</Button>
					) : null}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

const countSaid = (count: number, folder: string) =>
	count === 1 ? `${count} record · ${folder}` : `${count} records · ${folder}`;

const undatedSaid = (count: number) =>
	count === 1
		? `${count} record carries no date and stands outside every number on the card`
		: `${count} records carry no date and stand outside every number on the card`;

function rowPartOf(at: number, total: number): string | undefined {
	if (at === 0) return "record";
	if (at === total - 1) return "record-last";
	return undefined;
}

function amountPartOf(at: number, downAt: number): string | undefined {
	if (at === 0) return "record-amount";
	if (at === downAt) return "record-down";
	return undefined;
}
