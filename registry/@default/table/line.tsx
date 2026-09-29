export function Line({ tone, text }: { tone: string; text: string }) {
	return <div style={{ color: tone }}>{text}</div>;
}
