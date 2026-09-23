const SOURCE_UNREADABLE = "[widgetarium] this source names neither a folder nor a repository, so it was skipped";

export function sourcesOf({ added, legacy, shipped }) {
	const held = [];
	const seen = new Set();
	for (const source of [...listedIn(added), ...listedIn(legacy?.sources), ...listedIn(shipped)]) {
		if (!isReachableSource(source)) {
			console.error(SOURCE_UNREADABLE, source);
			continue;
		}
		const identity = identityOf(source);
		if (seen.has(identity)) continue;
		seen.add(identity);
		held.push(source);
	}
	return held;
}

export function identityOf(source) {
	return namesARepository(source)
		? `${source.repository}#${source.ref ?? ""}/${source.path ?? ""}`
		: String(source?.path ?? "");
}

export const isReachableSource = (source) =>
	carriesAWorkableRef(source) && (namesARepository(source) || namesAFolderOnThisMachine(source));

export const namesAFolderOnThisMachine = (source) => !namesARepository(source) && isNamed(source?.path);

const namesARepository = (source) => isNamed(source?.repository);
const carriesAWorkableRef = (source) => source?.ref === undefined || isNamed(source.ref);
const isNamed = (held) => typeof held === "string" && held !== "";
const listedIn = (held) => (Array.isArray(held) ? held : []);
