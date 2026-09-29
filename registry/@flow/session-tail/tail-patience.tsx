import { CSS } from "./style";
import type { Stage } from "./types";

const READING = "Reading the log…";
const STILL_READING = "Still reading the log — {seconds}s so far.";

export function TailPatience({ stage, seconds }: { stage: Stage; seconds: number }) {
	if (stage === "quiet") return <div className="wg-tail" />;
	return (
		<div className="wg-tail">
			<style>{CSS}</style>
			<p className="wg-tail-waiting">
				{stage === "slow" ? (
					<span className="wg-tail-track">
						<i className="wg-tail-sweep" />
					</span>
				) : (
					<i className="wg-tail-turn" />
				)}
				{stage === "slow" ? STILL_READING.replace("{seconds}", String(seconds)) : READING}
			</p>
		</div>
	);
}
