import { Icon } from "widgetarium/kit";
import { Avatars } from "./avatars";
import { has } from "./has";
import { MetaItem } from "./meta-item";
import type { Task } from "./types";

export function MetaRow({ due, files, initials }: { due: Task["due"]; files: Task["files"]; initials: string[] }) {
	if (!has(due) && !has(files) && initials.length === 0) return null;
	return (
		<div className="orbi-task-card-meta">
			{has(due) ? <MetaItem icon={<Icon name="clock" size={14} />} text={due} /> : null}
			{has(files) ? <MetaItem icon={<Icon name="folder" size={14} />} text={files} /> : null}
			<Avatars initials={initials} />
		</div>
	);
}
