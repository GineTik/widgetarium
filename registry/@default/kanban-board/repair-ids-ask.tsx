import { ConfirmDialog } from "widgetarium";
import type { useIdRepair } from "./use-id-repair";

const REPAIR_TITLE = "Repair duplicate ids?";
const REPAIR_ONE =
	"One board shares its id with another. The board whose path sorts first keeps it; the other is given a new one. Nothing else in either note changes.";
const REPAIR_MANY =
	"{count} boards share an id with another. In each pair the board whose path sorts first keeps it; the other is given a new one. Nothing else in either note changes.";
const REPAIR = "Repair";

export function RepairIdsAsk({ repairing }: { repairing: ReturnType<typeof useIdRepair> }) {
	return (
		<ConfirmDialog
			isOpen={repairing.isAsking}
			onOpenChange={repairing.dismiss}
			className="ok-repair-ids-ask"
			variant="accent"
			confirmLabel={REPAIR}
			title={REPAIR_TITLE}
			description={
				repairing.remintCount === 1 ? REPAIR_ONE : REPAIR_MANY.replace("{count}", String(repairing.remintCount))
			}
			onConfirm={repairing.repair}
		/>
	);
}
