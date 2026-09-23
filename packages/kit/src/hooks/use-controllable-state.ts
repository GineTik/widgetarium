import { useCallback, useRef, useState } from "react";

export function useControllableState<T>({
	prop,
	defaultProp,
	onChange,
}: {
	prop?: T;
	defaultProp: T;
	onChange?: (next: T) => void;
}): [T, (next: T) => void] {
	const [held, setHeld] = useState(defaultProp);
	const isControlled = prop !== undefined;
	const value = isControlled ? prop : held;
	const latest = useRef({ value, isControlled, onChange });
	latest.current = { value, isControlled, onChange };
	const setValue = useCallback((next: T) => {
		const { value: was, isControlled: controlled, onChange: told } = latest.current;
		if (Object.is(was, next)) return;
		latest.current = { ...latest.current, value: next };
		if (!controlled) setHeld(next);
		told?.(next);
	}, []);
	return [value, setValue];
}
