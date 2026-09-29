import type { ReactNode } from "react";

export function MetaItem({ icon, text }: { icon: ReactNode; text: ReactNode }) {
	return (
		<span className="orbi-task-card-meta-item">
			{icon}
			<span className="orbi-task-card-meta-text">{text}</span>
		</span>
	);
}
