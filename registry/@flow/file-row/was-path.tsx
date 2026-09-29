import { saidOf } from "./kinds";
import { PathText } from "./path-text";
import type { FileChange } from "./types";

const RENAMED_FROM = "Renamed from";

export function WasPath({ file }: { file: FileChange }) {
	const was = saidOf(file.from);
	if (was === "" || was === saidOf(file.filePath)) return null;

	return (
		<span className="ffr-was">
			<span className="ffr-was-word">{RENAMED_FROM}</span>
			<PathText path={was} />
		</span>
	);
}
