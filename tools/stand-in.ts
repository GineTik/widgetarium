// TRADE-OFF: checks only the members named, so a fake passes for the whole interface; typing every Obsidian member a test never reads costs more than it proves.
function holdsMembers<T extends object>(value: object, members: readonly (keyof T & string)[]): value is T {
	return members.every((member) => member in value);
}

export function standIn<T extends object>(fake: object, members: readonly (keyof T & string)[], what: string): T {
	if (holdsMembers<T>(fake, members)) return fake;
	const missing = members.filter((member) => !(member in fake));
	throw new TypeError(`the ${what} stand-in lacks ${missing.join(", ")}`);
}
