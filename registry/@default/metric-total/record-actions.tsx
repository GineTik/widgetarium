import type { RecordRef } from "widgetarium";
import { Icon, IconButton } from "widgetarium/kit";
import { Stroked } from "./stroked";
import type { Allowed, Listed } from "./types";

type RecordActionsProps = {
	row: Listed;
	allowed: Allowed;
	onEdit: (row: Listed) => void;
	onDelete: (ref: RecordRef) => void;
};

const DELETE_BIN = "M4.8 6.4h10.4M8.2 6.4V4.9h3.6v1.5M6.4 6.4l0.7 8.4h5.8l0.7-8.4";

export function RecordActions({ row, allowed, onEdit, onDelete }: RecordActionsProps) {
	return (
		<span data-part="record-actions" className="mt3-record-actions">
			{allowed.canEdit ? (
				<IconButton
					size="s"
					variant="raised"
					data-part="record-edit"
					className="mt3-record-btn"
					label="Edit"
					onClick={() => onEdit(row)}
				>
					<Icon name="pencil" size={15} className="mt3-record-icon" />
				</IconButton>
			) : null}
			{allowed.canDelete ? (
				<IconButton
					size="s"
					variant="raised"
					data-part="record-delete"
					className="mt3-record-btn"
					label="Delete"
					onClick={() => onDelete(row.ref)}
				>
					<Stroked className="mt3-record-icon" size={15} weight={1.6} join>
						<path d={DELETE_BIN} />
					</Stroked>
				</IconButton>
			) : null}
		</span>
	);
}
