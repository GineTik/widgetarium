import { TONE_NAMES, cn, toneClass } from "widgetarium/kit";

export function TonePicker({ picked, onPick }: { picked: string; onPick: (tone: string) => void }) {
	return (
		<div className="otd-tones">
			{TONE_NAMES.map((each: string) => (
				<button
					key={each}
					type="button"
					className={cn("otd-tone", toneClass(each), each === picked && "is-picked")}
					aria-label={each}
					title={each}
					aria-pressed={each === picked}
					onClick={() => onPick(each)}
				/>
			))}
		</div>
	);
}
