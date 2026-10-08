export type Handler<E> = (event: E) => void;

export function chainHandlers<E>(theirs: Handler<E> | undefined, ours: Handler<E>): Handler<E> {
	return (event) => {
		theirs?.(event);
		if (isPrevented(event)) return;
		ours(event);
	};
}

function isPrevented(event: unknown): boolean {
	return typeof event === "object" && event !== null && "defaultPrevented" in event && event.defaultPrevented === true;
}
