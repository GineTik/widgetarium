import { CSS } from "./style";

export function GridSaid({ text }: { text: string }) {
	return (
		<div className="flow-project-grid">
			<style>{CSS}</style>
			<p className="flow-project-grid-said">{text}</p>
		</div>
	);
}
