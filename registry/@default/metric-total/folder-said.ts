const AT_THE_ROOT = "Vault";

export function folderSaid(path: string | undefined): string {
	const cut = (path ?? "").lastIndexOf("/");
	if (cut < 1) return AT_THE_ROOT;
	const holding = path?.slice(0, cut) ?? "";
	return holding.slice(holding.lastIndexOf("/") + 1);
}
