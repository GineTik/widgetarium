import { saidOf } from "./kinds";

const NO_PATH = "No path";

export function PathText({ path, className }: { path: string; className?: string }) {
	const said = saidOf(path);
	const { dir, name } = splitPath(said);
	return said === "" ? (
		<span className={className ? `ffr-path ${className}` : "ffr-path"}>
			<span className="ffr-name is-missing">{NO_PATH}</span>
		</span>
	) : (
		<span className={className ? `ffr-path ${className}` : "ffr-path"} title={said}>
			{dir === "" ? null : (
				<span className="ffr-dir">
					<span>{dir}</span>
				</span>
			)}
			<span className="ffr-name">{name}</span>
		</span>
	);
}

function splitPath(path: string): { dir: string; name: string } {
	const cut = path.lastIndexOf("/");
	if (cut < 0) return { dir: "", name: path };
	return { dir: path.slice(0, cut + 1), name: path.slice(cut + 1) };
}
