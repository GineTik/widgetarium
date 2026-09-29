export function DiffBar({ added, removed }: { added: number | null; removed: number | null }) {
	const shares = sharesOf(added, removed);
	if (shares === null) return null;

	return (
		<span className="ffr-bar" aria-hidden="true">
			<i className="ffr-bar-added" style={{ width: `${shares.added}%` }} />
			<i className="ffr-bar-removed" style={{ width: `${shares.removed}%` }} />
		</span>
	);
}

function sharesOf(added: number | null, removed: number | null): { added: number; removed: number } | null {
	const up = added ?? 0;
	const down = removed ?? 0;
	const together = up + down;
	if (together === 0) return null;
	return { added: (up / together) * 100, removed: (down / together) * 100 };
}
