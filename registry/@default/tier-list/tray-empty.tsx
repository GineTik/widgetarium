import { Button, ButtonLabel, Icon } from "widgetarium/kit";

const NOTHING_TO_RANK = "Nothing to rank yet. Add a card, or start from a preset.";

const EVERYTHING_RANKED = "Everything is ranked. Drag a card back here to unrank it.";

export function TrayEmpty({
	hasNothing,
	onAddCard,
	onPresets,
}: {
	hasNothing: boolean;
	onAddCard: (() => void) | null;
	onPresets: (() => void) | null;
}) {
	return (
		<div className="wr-empty-rest">
			<span className="wr-tray-say">{hasNothing ? NOTHING_TO_RANK : EVERYTHING_RANKED}</span>
			{hasNothing && onAddCard ? (
				<Button size="s" onClick={onAddCard}>
					<Icon name="plus" size={14} />
					<ButtonLabel>Add a card</ButtonLabel>
				</Button>
			) : null}
			{hasNothing && onPresets ? (
				<Button size="s" variant="accent" onClick={onPresets}>
					<ButtonLabel>Presets</ButtonLabel>
				</Button>
			) : null}
		</div>
	);
}
