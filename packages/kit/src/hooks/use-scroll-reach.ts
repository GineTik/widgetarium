import { useCallback, useLayoutEffect, useState } from "react";
import type { RefObject } from "react";

export interface ScrollReach {
	readonly up: boolean;
	readonly down: boolean;
}

export interface ScrollReachWatch {
	readonly reach: ScrollReach;
	readonly measureReach: () => void;
}

export function useScrollReach(listRef: RefObject<Element | null>): ScrollReachWatch {
	const [reach, setReach] = useState<ScrollReach>({ up: false, down: false });
	const measureReach = useCallback(() => {
		const list = listRef.current;
		if (!list) return;
		const up = list.scrollTop > 1;
		const down = list.scrollTop + list.clientHeight < list.scrollHeight - 1;
		setReach((was) => (was.up === up && was.down === down ? was : { up, down }));
	}, []);
	useLayoutEffect(measureReach);
	return { reach, measureReach };
}
