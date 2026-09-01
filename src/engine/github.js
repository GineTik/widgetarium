// CONTEXT: one curated index names repositories; this is the only place their URLs are built
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

export function folderFor(root, id) {
	const [scope, name] = String(id ?? "").split("/");
	return scope && name ? `${root}/${scope}/${name}` : null;
}
