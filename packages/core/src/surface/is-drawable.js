export function isDrawable(definition) {
	return Boolean(definition?.component) && !definition.error;
}
