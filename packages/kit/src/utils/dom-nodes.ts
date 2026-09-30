export function isNode(target: EventTarget | null): target is Node {
	return target !== null && "nodeType" in target;
}

export function isElement(target: EventTarget | null): target is Element {
	return isNode(target) && "tagName" in target;
}

export function isFocusable(node: Element | null): node is HTMLElement {
	return node !== null && "focus" in node;
}
