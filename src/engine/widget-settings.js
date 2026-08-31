// CONTEXT: what a widget is tuned by when nobody has tuned it — its manifest, and one spelling
export function settingDefaults(manifest) {
	const result = {};
	for (const field of manifest?.settings ?? []) {
		if (field.default !== undefined) result[field.key] = field.default;
	}
	return result;
}
