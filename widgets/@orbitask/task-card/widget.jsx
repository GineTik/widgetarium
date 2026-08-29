import { createWidget, WidgetRoot } from "widgetarium";
import { APPROVAL_TONES, Icon, PRIORITY_TONES, Pill, toneOf } from "widgetarium/kit";

// CONTEXT: the card IS the widget root, and .wg-widget-root[data-…] outweighs .wg-kit-card
// CONTEXT: [data-rounded] is always set, so this scores (0,3,0) and stops tying on source order
const CSS = `
.orbi-task-card.wg-widget-root[data-rounded] {
	display: flex;
	flex-direction: column;
	gap: var(--size-4-2, 8px);
	padding: var(--size-4-3, 12px);
	border-radius: var(--wg-kit-item);
	transition: transform var(--orbi-press) var(--orbi-ease);
}

.orbi-task-card.wg-widget-root:active {
	transform: scale(0.955);
}

.orbi-task-card-stripe {
	flex: none;
	width: 32px;
	height: 4px;
	border-radius: var(--wg-kit-pill);
}

.orbi-task-card-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--size-4-2, 8px);
}

/* CONTEXT: max-height is the fallback where -webkit-box is unsupported — two lines, no ellipsis */
.orbi-task-card-title {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
	min-width: 0;
	max-height: calc(var(--font-ui-small, 14px) * var(--line-height-tight, 1.25) * 2);
	margin: 0;
	font-size: var(--font-ui-small, 14px);
	font-weight: var(--font-semibold, 600);
	line-height: var(--line-height-tight, 1.25);
}

.orbi-task-card-badges {
	display: flex;
	flex: none;
	align-items: center;
	gap: var(--size-2-2, 4px);
}

.orbi-task-card-track {
	display: flex;
	align-items: center;
	gap: var(--size-4-2, 8px);
}

.orbi-task-card-bar {
	overflow: hidden;
	flex: 1;
	height: 6px;
	border-radius: var(--wg-kit-pill);
	background: var(--wg-kit-fill);
}

.orbi-task-card-bar-fill {
	display: block;
	height: 100%;
	border-radius: var(--wg-kit-pill);
	background: var(--interactive-accent);
}

.orbi-task-card-percent {
	flex: none;
	font-family: var(--font-monospace);
	font-size: var(--font-ui-smaller, 12px);
	color: var(--text-muted);
}

.orbi-task-card-meta {
	display: flex;
	align-items: center;
	gap: var(--size-4-3, 12px);
	font-size: var(--font-ui-smaller, 12px);
	color: var(--text-faint);
}

/* TRADE-OFF: the text gives first — the avatar group is already capped, so nothing else can */
.orbi-task-card-meta-item {
	display: inline-flex;
	align-items: center;
	gap: var(--size-2-2, 4px);
	min-width: 0;
}

.orbi-task-card-meta-text {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.orbi-task-card-avatars {
	display: flex;
	flex: none;
	margin-left: auto;
}

/* CONTEXT: the 2px ring in the surface colour is what makes the -8px overlap readable */
.orbi-task-card-avatar {
	display: grid;
	flex: none;
	place-content: center;
	box-sizing: border-box;
	width: 28px;
	height: 28px;
	margin-left: -8px;
	border-radius: var(--wg-kit-pill);
	box-shadow: 0 0 0 2px var(--background-primary);
	font-size: var(--font-ui-smaller, 12px);
	font-weight: var(--font-semibold, 600);
}

.orbi-task-card-avatar:first-child {
	margin-left: 0;
}

/* CONTEXT: the count is not a person, so it carries the neutral pill's tone */
.orbi-task-card-avatar-rest {
	background: var(--wg-kit-fill);
	color: var(--text-muted);
}

/* CONTEXT: the row used to vanish whole below 220px, which is most of a 258px column */
@container widget (width < 240px) {
	.orbi-task-card .orbi-task-card-meta {
		gap: var(--size-4-2, 8px);
	}
}

@container widget (width < 150px) {
	.orbi-task-card .orbi-task-card-badges {
		display: none;
	}
}

@media (prefers-reduced-motion: reduce) {
	.orbi-task-card.wg-widget-root:active {
		transform: none;
	}
}
`;

const STRIPE_COLOURS = {
	error: "var(--text-error)",
	warning: "var(--wg-kit-warning)",
	success: "var(--text-success)",
	info: "var(--interactive-accent)",
};

const STATUS_LABELS = { approve: "Approve", check: "Check", reject: "Reject", review: "Review" };

// CONTEXT: four circles is 88px of a 256px row — a fifth pushed the dates off the card
const AVATAR_CAP = 3;

const AVATAR_TONE_STYLES = [
	{ background: "var(--wg-kit-accent-wash)", color: "var(--interactive-accent)" },
	{ background: "var(--wg-kit-success-wash)", color: "var(--text-success)" },
	{ background: "var(--wg-kit-error-wash)", color: "var(--text-error)" },
	{ background: "var(--wg-kit-warning-wash)", color: "var(--wg-kit-warning)" },
];

function MetaItem({ icon, text }) {
	return (
		<span class="orbi-task-card-meta-item">
			{icon}
			<span class="orbi-task-card-meta-text">{text}</span>
		</span>
	);
}

function percentOf(value) {
	const number = Number(value);
	if (!Number.isFinite(number)) return 0;
	return Math.max(0, Math.min(100, Math.round(number)));
}

// CONTEXT: the note holds a person, the card draws the letter — storing "A" leaked it into the filter
function initialsOf(value) {
	const held = Array.isArray(value) ? value : String(value ?? "").split(",");
	return held
		.map((entry) => String(entry).trim())
		.filter(Boolean)
		.map((name) => name.charAt(0).toUpperCase());
}

// CONTEXT: a field the note lacks is not drawn — defaults made every task render as the mock
function has(value) {
	return value !== undefined && value !== null && value !== "";
}

// CONTEXT: notes write the value in either casing; the label is authored here in English
function labelOf(status) {
	return STATUS_LABELS[status.toLowerCase()] ?? status;
}

export default createWidget(function OrbiTaskCard({ settings, task }) {
	// CONTEXT: the board hands down `task`; standing alone, the card has only its settings
	const card = task ?? {
		title: settings.title,
		tag: settings.tagColour,
		priority: settings.priority,
		status: settings.status,
		progress: settings.progress,
		initials: settings.initials,
		due: settings.dueDate,
		comments: settings.comments,
		files: settings.attachments,
		checklistDone: settings.checklistDone,
		checklistTotal: settings.checklistTotal,
	};

	const priority = has(card.priority) ? String(card.priority) : null;
	const status = has(card.status) ? String(card.status) : null;
	const progress = has(card.progress) ? percentOf(card.progress) : null;
	const initials = initialsOf(card.initials);
	const shownInitials = initials.slice(0, AVATAR_CAP);
	const restCount = initials.length - shownInitials.length;
	const checklistTotal = Number(card.checklistTotal) || 0;
	const hasMeta = has(card.due) || has(card.comments) || has(card.files) || checklistTotal > 0;

	return (
		<WidgetRoot className="orbi wg-kit-card orbi-task-card">
			<style>{CSS}</style>

			{has(card.tag) ? (
				<span
					class="orbi-task-card-stripe"
					style={{ background: STRIPE_COLOURS[String(card.tag)] ?? STRIPE_COLOURS.error }}
				/>
			) : null}

			<div class="orbi-task-card-head">
				<h4 class="orbi-task-card-title">{card.title ?? "Untitled"}</h4>
				{priority || status ? (
					<div class="orbi-task-card-badges">
						{priority ? <Pill tone={toneOf(PRIORITY_TONES, priority)}>{priority}</Pill> : null}
						{status ? <Pill tone={toneOf(APPROVAL_TONES, status)}>{labelOf(status)}</Pill> : null}
					</div>
				) : null}
			</div>

			{progress !== null ? (
				<div class="orbi-task-card-track">
					<span class="orbi-task-card-bar">
						<i class="orbi-task-card-bar-fill" style={{ width: `${progress}%` }} />
					</span>
					<span class="orbi-task-card-percent">{progress}%</span>
				</div>
			) : null}

			{hasMeta || initials.length > 0 ? (
				<div class="orbi-task-card-meta">
					{has(card.due) ? <MetaItem icon={<Icon name="clock" size={14} />} text={card.due} /> : null}
					{has(card.comments) ? <MetaItem icon={<Icon name="chat" size={14} />} text={card.comments} /> : null}
					{has(card.files) ? <MetaItem icon={<Icon name="folder" size={14} />} text={card.files} /> : null}
					{checklistTotal > 0 ? (
						<MetaItem
							icon={<Icon name="check" size={14} />}
							text={`${Number(card.checklistDone) || 0}/${checklistTotal}`}
						/>
					) : null}
					{initials.length > 0 ? (
						<span class="orbi-task-card-avatars">
							{shownInitials.map((initial, index) => (
								<i
									key={`${initial}-${index}`}
									class="orbi-task-card-avatar"
									style={AVATAR_TONE_STYLES[index % AVATAR_TONE_STYLES.length]}
								>
									{initial}
								</i>
							))}
							{restCount > 0 ? (
								<i class="orbi-task-card-avatar orbi-task-card-avatar-rest">+{restCount}</i>
							) : null}
						</span>
					) : null}
				</div>
			) : null}
		</WidgetRoot>
	);
});
