export function listen<K extends keyof HTMLElementEventMap>(
	target: HTMLElement,
	type: K,
	listener: (event: HTMLElementEventMap[K]) => void,
	options?: AddEventListenerOptions,
): () => void {
	target.addEventListener(type, listener, options);
	return () => target.removeEventListener(type, listener);
}
