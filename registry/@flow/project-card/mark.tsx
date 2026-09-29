export function Mark({ mark }: { mark: string | null }) {
	if (mark === null) return null;
	return <span className="flow-project-card-mark">{mark}</span>;
}
