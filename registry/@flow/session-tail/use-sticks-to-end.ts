import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

const STICK_SLACK_PX = 8;

export function useSticksToEnd(isFollowing: boolean, end: string, onEndness: (atEnd: boolean) => void) {
	const scroller = useRef<HTMLDivElement>(null);

	const stick = useCallback(() => {
		const node = scroller.current;
		if (node) node.scrollTop = node.scrollHeight;
	}, []);

	useLayoutEffect(() => {
		if (isFollowing) stick();
	}, [isFollowing, end, stick]);

	useEffect(() => {
		const node = scroller.current;
		if (!node) return undefined;
		const watcher = new ResizeObserver(() => {
			if (isFollowing) stick();
		});
		watcher.observe(node);
		return () => watcher.disconnect();
	}, [isFollowing, stick]);

	const onScroll = useCallback(() => {
		const node = scroller.current;
		if (node) onEndness(node.scrollHeight - node.clientHeight - node.scrollTop <= STICK_SLACK_PX);
	}, [onEndness]);

	return { scroller, onScroll };
}
