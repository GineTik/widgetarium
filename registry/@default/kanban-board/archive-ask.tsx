import { ConfirmDialog } from "widgetarium";

type ArchiveAskProps = {
	archiving: string | null;
	heldByArchiving: number;
	groupBy: string;
	onDismiss: () => void;
	onConfirm: () => void;
};

const ARCHIVE_TITLE = "Archive {name}?";
const ARCHIVE = "Archive";

export function ArchiveAsk({ archiving, heldByArchiving, groupBy, onDismiss, onConfirm }: ArchiveAskProps) {
	return (
		<ConfirmDialog
			isOpen={Boolean(archiving)}
			onOpenChange={onDismiss}
			className="ok-archive"
			variant="accent"
			confirmLabel={ARCHIVE}
			title={ARCHIVE_TITLE.replace("{name}", archiving ?? "")}
			description={
				<>
					The list leaves the board. Its {heldByArchiving} task{heldByArchiving === 1 ? "" : "s"} keep their {groupBy}{" "}
					property, so nothing in the notes changes and restoring the list brings them all back.
				</>
			}
			onConfirm={onConfirm}
		/>
	);
}
