import { useEffect, useState } from "react";

interface MeasuredNode {
	readonly current: HTMLElement | null;
}

interface BoxSize {
	readonly width: number;
	readonly height: number;
}

export function useBox(nodeRef: MeasuredNode): BoxSize {
	const [box, setBox] = useState<BoxSize>({ width: 0, height: 0 });

	useEffect(() => {
		const node = nodeRef.current;
		if (!node) return undefined;
		const read = (): void =>
			setBox((held) =>
				held.width === node.clientWidth && held.height === node.clientHeight
					? held
					: { width: node.clientWidth, height: node.clientHeight },
			);
		read();
		const watch = new ResizeObserver(read);
		watch.observe(node);
		return () => watch.disconnect();
	}, [nodeRef]);

	return box;
}

export function useWidth(nodeRef: MeasuredNode): number {
	return useBox(nodeRef).width;
}
