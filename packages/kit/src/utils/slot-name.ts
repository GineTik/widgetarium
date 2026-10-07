export function slotNameOf(componentName: string): string {
	return componentName.replace(/(?<=[a-z0-9])([A-Z])/g, "-$1").toLowerCase();
}
