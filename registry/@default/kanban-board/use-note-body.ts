import { useEffect, useState } from "react";
import type { DescriptionProps } from "./types";

export function useNoteBody({ path, read, write }: Pick<DescriptionProps, "path" | "read" | "write">) {
	const [saved, setSaved] = useState("");
	const [draft, setDraft] = useState("");
	const [isRefused, setRefused] = useState(false);

	useEffect(() => {
		let alive = true;
		read({ path }).then((record) => {
			if (!alive) return;
			setSaved(record?.body ?? "");
			setDraft(record?.body ?? "");
			setRefused(false);
		});
		return () => {
			alive = false;
		};
	}, [path]);

	const save = async () => {
		if (draft === saved) return;
		const record = await write({ path }, { body: draft });
		if (record?.body === undefined) return setRefused(true);
		setRefused(false);
		setSaved(record.body);
		setDraft(record.body);
	};

	return { draft, setDraft, isRefused, save };
}
