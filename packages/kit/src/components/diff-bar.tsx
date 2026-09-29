import { createElement as h } from "react";

export function DiffBar({
	added,
	removed,
	className,
}: {
	added: number | null;
	removed: number | null;
	className: string;
}) {
	const shares = sharesOf(added, removed);
	if (shares === null) return null;

	return (
		<span className={className} aria-hidden="true">
			<i className={`${className}-added`} style={{ width: `${shares.added}%` }} />
			<i className={`${className}-removed`} style={{ width: `${shares.removed}%` }} />
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
