export interface Repository {
	readonly owner: string;
	readonly repo: string;
}

type HeldText = string | null | undefined;

const STEPS_OUT_OR_IN_FROM_THE_ROOT = /(^|\/)\.\.?(\/|$)|^\/|^[a-z][a-z0-9+.-]*:|\\/i;

export function readRepository(url: unknown): Repository | null {
	const found = /^https?:\/\/github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/.exec(String(url ?? "").trim());
	const owner = found?.[1];
	const repo = found?.[2];
	return owner && repo ? { owner, repo } : null;
}

export function commitUrl(repository: Repository, ref: unknown): string {
	return `https://api.github.com/repos/${repository.owner}/${repository.repo}/commits/${encodeURIComponent(String(ref || "HEAD"))}`;
}

export function rawUrl(repository: Repository, commit: string, path: string): string {
	return `https://raw.githubusercontent.com/${repository.owner}/${repository.repo}/${commit}/${path}`;
}

export function treeUrl(repository: Repository, commit: string): string {
	return `https://api.github.com/repos/${repository.owner}/${repository.repo}/git/trees/${commit}?recursive=1`;
}

export function isCleanRepositoryPath(path: unknown): path is string {
	return typeof path === "string" && path !== "" && !STEPS_OUT_OR_IN_FROM_THE_ROOT.test(path);
}

export function isBareFileName(name: unknown): name is string {
	return typeof name === "string" && name !== "" && !/[\\/]/.test(name) && name !== "." && name !== "..";
}

export function isPathInsideFolder(name: unknown): name is string {
	return isCleanRepositoryPath(name) && !name.split("/").includes("");
}

export function scopedName(id: unknown): string | null {
	const [scope, name] = String(id ?? "").split("/");
	return isBareFileName(scope) && isBareFileName(name) ? `${scope}/${name}` : null;
}

export function folderFor(root: string, id: unknown): string | null {
	const named = scopedName(id);
	return named ? `${root}/${named}` : null;
}

export function scopeRefusal(id: unknown): string | null {
	return scopedName(id) ? null : `"${String(id)}" is not a scoped widget id`;
}

export function idOfFolder(folder: HeldText): string {
	const parts = String(folder ?? "").split("/");
	const name = parts.pop() ?? "";
	const scope = parts.pop() ?? "";
	return scope.startsWith("@") && name ? `${scope}/${name}` : "";
}
