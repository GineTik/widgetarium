import { Button, ButtonLabel, Count } from "widgetarium/kit";
import type { May, Opened } from "./types";

export function Head({
	heading,
	cards,
	ranked,
	may,
	opened,
}: {
	heading: string;
	cards: number;
	ranked: number;
	may: May;
	opened: Opened;
}) {
	return (
		<div className="wr-head">
			{heading ? <span className="wr-title">{heading}</span> : null}
			<Count>{cards}</Count>
			<span className="wr-head-rest">
				{may.preset ? (
					<Button size="s" variant="accent" onClick={opened.pickPreset}>
						<ButtonLabel>Presets</ButtonLabel>
					</Button>
				) : null}
				{ranked > 0 && may.edit ? (
					<Button size="s" onClick={opened.reset}>
						<ButtonLabel>Reset</ButtonLabel>
					</Button>
				) : null}
			</span>
		</div>
	);
}
