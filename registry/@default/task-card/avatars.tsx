const AVATAR_CAP = 3;

const AVATAR_TONE_STYLES = [
	{ background: "var(--wg-kit-accent-wash)", color: "var(--interactive-accent)" },
	{ background: "var(--wg-kit-success-wash)", color: "var(--text-success)" },
	{ background: "var(--wg-kit-error-wash)", color: "var(--text-error)" },
	{ background: "var(--wg-kit-warning-wash)", color: "var(--wg-kit-warning)" },
];

export function Avatars({ initials }: { initials: string[] }) {
	if (initials.length === 0) return null;
	const shown = initials.slice(0, AVATAR_CAP);
	const restCount = initials.length - shown.length;
	return (
		<span className="orbi-task-card-avatars">
			{shown.map((initial, index) => (
				<i
					key={`${initial}-${index}`}
					className="orbi-task-card-avatar"
					style={AVATAR_TONE_STYLES[index % AVATAR_TONE_STYLES.length]}
				>
					{initial}
				</i>
			))}
			{restCount > 0 ? <i className="orbi-task-card-avatar orbi-task-card-avatar-rest">+{restCount}</i> : null}
		</span>
	);
}
