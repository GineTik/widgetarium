export function Said({ text, isFailure = false }: { text: string; isFailure?: boolean }) {
	return (
		<p className="wg-chart-said" data-failure={isFailure ? "" : undefined}>
			{text}
		</p>
	);
}
