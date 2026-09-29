import { CSS } from "./style";

export function InFlightSaid({ text }: { text: string }) {
	return (
		<div className="flow-inflight">
			<style>{CSS}</style>
			<p className="flow-inflight-said">{text}</p>
		</div>
	);
}
