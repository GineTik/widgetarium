import { Mark } from "./mark";
import type { Head } from "./types";

export function HeadRow({ head }: { head: Head }) {
	return (
		<div className="flow-project-card-head">
			<Mark mark={head.mark} />
			<div className="flow-project-card-names">
				{head.name === null ? null : (
					<h3 className="flow-project-card-name" title={head.name}>
						{head.name}
					</h3>
				)}
				{head.repository === null ? null : (
					<span className="flow-project-card-repo" title={head.repository}>
						<bdi dir="ltr">{head.repository}</bdi>
					</span>
				)}
			</div>
		</div>
	);
}
