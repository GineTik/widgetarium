import { useEffect, useRef, useState } from "react";

export function useClamped(text: string) {
	const body = useRef<HTMLParagraphElement>(null);
	const [isOpen, setOpen] = useState(false);
	const [isOverflowing, setOverflowing] = useState(false);

	useEffect(() => {
		const node = body.current;
		if (!node || isOpen) return undefined;
		const measure = () => setOverflowing(node.scrollHeight > node.clientHeight + 1);
		measure();
		const watcher = new ResizeObserver(measure);
		watcher.observe(node);
		return () => watcher.disconnect();
	}, [text, isOpen]);

	return { body, isOpen, isOverflowing, toggle: () => setOpen(!isOpen) };
}
