export function readRepository(url) {
	const found = /^https?:\/\/github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/.exec(String(url ?? "").trim());
	return found ? { owner: found[1], repo: found[2] } : null;
}

export function commitUrl(repository, ref) {
	return `https://api.github.com/repos/${repository.owner}/${repository.repo}/commits/${encodeURIComponent(ref || "HEAD")}`;
}

export function rawUrl(repository, commit, path) {
	return `https://raw.githubusercontent.com/${repository.owner}/${repository.repo}/${commit}/${path}`;
}

export function treeUrl(repository, commit) {
	return `https://api.github.com/repos/${repository.owner}/${repository.repo}/git/trees/${commit}?recursive=1`;
}

const STEPS_OUT_OR_IN_FROM_THE_ROOT = /(^|\/)\.\.?(\/|$)|^\/|^[a-z][a-z0-9+.-]*:|\\/i;

export function isCleanRepositoryPath(path) {
	return typeof path === "string" && path !== "" && !STEPS_OUT_OR_IN_FROM_THE_ROOT.test(path);
}

export function isBareFileName(name) {
	return typeof name === "string" && name !== "" && !/[\\/]/.test(name) && name !== "." && name !== "..";
}

export function scopedName(id) {
	const [scope, name] = String(id ?? "").split("/");
	return isBareFileName(scope) && isBareFileName(name) ? `${scope}/${name}` : null;
}

export function folderFor(root, id) {
	const named = scopedName(id);
	return named ? `${root}/${named}` : null;
}

export function scopeRefusal(id) {
	return scopedName(id) ? null : `"${id}" is not a scoped widget id`;
}

export function idOfFolder(folder) {
	const parts = String(folder ?? "").split("/");
	const name = parts.pop() ?? "";
	const scope = parts.pop() ?? "";
	return scope.startsWith("@") && name ? `${scope}/${name}` : "";
}
