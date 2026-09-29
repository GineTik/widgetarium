import { useEffect, useState } from "react";

export function useDraftBoard(saved, save, onDrafting) {
	const [staged, setStaged] = useState(null);
	useEffect(() => {
		onDrafting?.(staged !== null);
	});
	return {
		staged,
		setStaged,
		board: staged ?? saved,
		onChange: (next, isCommit = true) => (staged === null ? save(next, isCommit) : setStaged(next)),
	};
}
