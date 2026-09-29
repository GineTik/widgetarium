export function filled(sentence: string, values: Record<string, string>) {
	return Object.entries(values).reduce((held, [name, value]) => held.replace(`{${name}}`, value), sentence);
}
