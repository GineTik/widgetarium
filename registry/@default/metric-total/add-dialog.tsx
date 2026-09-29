import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "widgetarium";
import { Button, Calendar, Field, Segmented } from "widgetarium/kit";
import { CloseButton } from "./close-button";
import { dateOf, isoFrom } from "./days";
import type { Draft } from "./types";

type AddDialogProps = {
	draft: Draft;
	unit: string;
	today: string;
	onDraft: (next: Draft) => void;
	onClose: () => void;
	onConfirm: () => void;
};

const SIGNS = [
	{ value: "add", label: "Add" },
	{ value: "subtract", label: "Subtract" },
];

const ADD_TITLE = "Add a record";
const ADD_DESC = "One note lands in Metrics, named after the day and the minute.";

export function AddDialog({ draft, unit, today, onDraft, onClose, onConfirm }: AddDialogProps) {
	return (
		<Dialog isOpen onClose={onClose}>
			<DialogContent className="mt3-add-dialog">
				<CloseButton name="add" onClose={onClose} />
				<DialogHeader data-part="add-head">
					<DialogTitle data-part="add-title">{ADD_TITLE}</DialogTitle>
					<DialogDescription data-part="add-desc">{ADD_DESC}</DialogDescription>
				</DialogHeader>
				<div data-part="add-body" className="mt3-add-body">
					{/* TRADE-OFF: the kit's six rows, ~39px taller than the artboard's five */}
					<Calendar
						className="mt3-calendar"
						selected={dateOf(draft.day)}
						today={dateOf(today)}
						onSelect={(day: Date) => onDraft({ ...draft, day: isoFrom(day) })}
					/>
					<div data-part="add-side" className="mt3-side">
						<span data-part="label-amount" className="mt3-label">
							Amount
						</span>
						<Segmented
							items={SIGNS}
							value={draft.sign}
							onChange={(sign: string) => onDraft({ ...draft, sign })}
							size="s"
							className="mt3-sign"
						/>
						<Field
							className="mt3-amount"
							type="number"
							value={draft.amount}
							onInput={(event: { currentTarget: HTMLInputElement }) =>
								onDraft({ ...draft, amount: event.currentTarget.value })
							}
							icon={
								<span data-part="amount-unit" className="mt3-amount-unit">
									{unit}
								</span>
							}
						/>
						<span data-part="label-note" className="mt3-label">
							Note
						</span>
						<div className="mt3-note">
							<textarea
								placeholder="Optional"
								value={draft.note}
								onInput={(event) => onDraft({ ...draft, note: event.currentTarget.value })}
							/>
						</div>
					</div>
				</div>
				<DialogFooter data-part="add-foot">
					<Button size="s" className="mt3-btn" data-part="cancel" onClick={onClose}>
						Cancel
					</Button>
					<Button size="s" variant="accent" className="mt3-btn" data-part="confirm" onClick={onConfirm}>
						Add record
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
