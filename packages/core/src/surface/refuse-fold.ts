export function refuseFold(): boolean {
	console.warn("Widgetarium: this widget was rendered without a board and cannot fold its views into a group");
	return false;
}
