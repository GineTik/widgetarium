import { CSS } from "./style";

export function TailSaid({ text }: { text: string }) {
	return (
		<div className="wg-tail">
			<style>{CSS}</style>
			<p className="wg-tail-said">{text}</p>
		</div>
	);
}
