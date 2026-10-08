export function scrollOffsetOf(node: HTMLElement, isVertical: boolean): number {
	return isVertical ? node.scrollTop : node.scrollLeft;
}

export function scrollToOffset(node: HTMLElement, isVertical: boolean, at: number): void {
	if (isVertical) node.scrollTop = at;
	else node.scrollLeft = at;
}
