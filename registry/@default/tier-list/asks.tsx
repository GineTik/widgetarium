import { ConfirmDialog } from "widgetarium";
import type { Preset } from "./presets";
import type { Opened, Writing } from "./types";

const RESET_TITLE = "Put {count} cards back in the tray?";
const RESET_SAID =
	"Every card leaves the row it is in and returns to the tray. The rows, their names and their colours stay exactly as they are, and no card is deleted.";
const RESET_CONFIRM = "Put them back";
const REPLACE_TITLE = "Replace what is here with {name}?";
const REPLACE_SAID =
	"The {cards} cards and {rows} rows in this tile are dropped, and the preset's own take their place.";
const REPLACE_CONFIRM = "Use this preset";

export function Asks({
	opened,
	write,
	ranked,
	cards,
	rows,
}: {
	opened: Opened;
	write: Writing;
	ranked: number;
	cards: number;
	rows: number;
}) {
	return (
		<>
			<ConfirmDialog
				isOpen={Boolean(opened.preset)}
				onOpenChange={opened.closeWanted}
				className="wg-rank"
				variant="accent"
				confirmLabel={REPLACE_CONFIRM}
				title={REPLACE_TITLE.replace("{name}", opened.preset?.name ?? "")}
				description={REPLACE_SAID.replace("{cards}", String(cards)).replace("{rows}", String(rows))}
				onConfirm={() => {
					const kept = opened.preset as Preset;
					opened.closeWanted();
					opened.closePresets();
					void write.preset(kept);
				}}
			/>

			<ConfirmDialog
				isOpen={opened.isResetting}
				onOpenChange={opened.closeReset}
				className="wg-rank"
				variant="danger"
				confirmLabel={RESET_CONFIRM}
				title={RESET_TITLE.replace("{count}", String(ranked))}
				description={RESET_SAID}
				onConfirm={() => {
					opened.closeReset();
					void write.resetRanks();
				}}
			/>
		</>
	);
}
