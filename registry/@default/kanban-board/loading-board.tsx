import { CSS } from "./style";

export function LoadingBoard() {
	return (
		<div className="orbi orbi-kanban">
			<style>{CSS}</style>
			<p className="ok-empty">Loading tasks…</p>
		</div>
	);
}
