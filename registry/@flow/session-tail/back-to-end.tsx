import { Button, Count, Icon } from "widgetarium/kit";

const BACK_TO_END = "Jump to the newest line";

export function BackToEnd({ behind, onPress }: { behind: number; onPress: () => void }) {
	return (
		<div className="wg-tail-back">
			<Button variant="accent" size="s" onClick={onPress}>
				<Icon name="arrow-down" size={16} />
				{BACK_TO_END}
				{behind > 0 ? <Count>{behind}</Count> : null}
			</Button>
		</div>
	);
}
