import { useCallback, useLayoutEffect, useState } from "react";

export function useScrollReach(listRef) {
	const [reach, setReach] = useState({ up: false, down: false });
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
