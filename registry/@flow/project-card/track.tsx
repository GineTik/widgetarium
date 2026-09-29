export function Track({ percent }: { percent: number | null }) {
	if (percent === null) return null;
	return (
		<div className="flow-project-card-track">
			<span className="flow-project-card-bar">
				<i className="flow-project-card-bar-fill" style={{ width: `${percent}%` }} />
			</span>
			<span className="flow-project-card-percent">{percent}%</span>
		</div>
	);
}
