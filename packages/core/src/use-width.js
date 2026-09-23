import { useEffect, useState } from "react";

export function useBox(nodeRef) {
	const [box, setBox] = useState({ width: 0, height: 0 });

	useEffect(() => {
		const node = nodeRef.current;
		if (!node) return undefined;
		const read = () =>
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

export function useWidth(nodeRef) {
	return useBox(nodeRef).width;
}
