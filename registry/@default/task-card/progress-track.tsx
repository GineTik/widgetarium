export function ProgressTrack({ progress }: { progress: number | null }) {
	if (progress === null) return null;
	return (
		<div className="orbi-task-card-track">
			<span className="orbi-task-card-bar">
				<i className="orbi-task-card-bar-fill" style={{ width: `${progress}%` }} />
			</span>
			<span className="orbi-task-card-percent">{progress}%</span>
		</div>
	);
}
