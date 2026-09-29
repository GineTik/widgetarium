import { useEffect, useState } from "react";

export function useVaultFields(host, paths) {
	const [held, setHeld] = useState({});
	const wanted = JSON.stringify(paths);
	useEffect(() => {
		let alive = true;
		const asked = JSON.parse(wanted);
		Promise.all(asked.map((path) => host?.slot?.({ kind: "folder", path })?.describe?.() ?? []))
			.then((found) => alive && setHeld(Object.fromEntries(asked.map((path, at) => [path, found[at] ?? []]))))
			.catch(() => {});
		return () => {
			alive = false;
		};
	}, [wanted, host]);
	return held;
}
