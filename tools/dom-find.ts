type ElementKind<E extends Element> = abstract new (...args: never[]) => E;

export function found(root: ParentNode, selector: string): Element {
	const element = root.querySelector(selector);
	if (!element) throw new Error(`nothing on the page matches ${selector}`);
	return element;
}

export function foundAs<E extends Element>(root: ParentNode, selector: string, kind: ElementKind<E>): E {
	const element = found(root, selector);
	if (!(element instanceof kind)) throw new Error(`${selector} is not a ${kind.name}`);
	return element;
}

export function byId(document: Document, id: string): HTMLElement {
	const element = document.getElementById(id);
	if (!element) throw new Error(`nothing on the page has the id ${id}`);
	return element;
}
