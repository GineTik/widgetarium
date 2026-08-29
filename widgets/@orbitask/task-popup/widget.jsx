import { createWidget, WidgetRoot } from "widgetarium";

const CSS = `
.orbi-task-popup.wg-widget-root {
	/* the board's radius is a TILE's; this card's own design asks 16px */
	border-radius: var(--orbi-radius-lg);
}

.orbi-task-popup .otp-shell {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 220px;
	gap: 32px;
	height: 100%;
	padding: 24px;
	background: var(--orbi-neutral-0);
	border-radius: var(--orbi-radius-lg);
	overflow: auto;
}

.orbi-task-popup .otp-main { display: flex; flex-direction: column; gap: 24px; min-width: 0; }

.orbi-task-popup .otp-title-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.orbi-task-popup .otp-title { font: var(--orbi-title-md); color: var(--orbi-neutral-800); }

.orbi-task-popup .otp-chip {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 6px 14px;
	border-radius: var(--orbi-radius-sm);
	font: var(--orbi-body-sm);
}

.orbi-task-popup .otp-chip[data-kind="priority"] { background: var(--orbi-info-50); color: var(--orbi-primary-600); }
.orbi-task-popup .otp-chip[data-kind="approval"] { background: var(--orbi-success-50); color: var(--orbi-success-600); }

.orbi-task-popup .otp-sub { font: var(--orbi-body-xs); color: var(--orbi-neutral-500); }

.orbi-task-popup .otp-section-title {
	font: var(--orbi-label-xs);
	color: var(--orbi-neutral-800);
	margin-bottom: 8px;
}

.orbi-task-popup .otp-side { display: flex; flex-direction: column; gap: 4px; }

.orbi-task-popup .otp-action {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 8px;
	border-radius: 0;
	font: var(--orbi-body-sm);
	color: var(--orbi-neutral-800);
	text-align: left;
}

.orbi-task-popup .otp-action::before { border-radius: var(--orbi-radius-md); }
.orbi-task-popup .otp-action:hover::before { background: var(--orbi-neutral-50); }

.orbi-task-popup .otp-action-mark {
	width: 32px;
	height: 32px;
	flex: none;
	border: none;
	border-radius: var(--orbi-radius-md);
}

.orbi-task-popup .otp-empty { margin: 0; padding: 24px; font: var(--orbi-body-sm); color: var(--orbi-neutral-500); }


@container widget (width < 640px) {
	.orbi-task-popup .otp-side {
		display: none;
	}

	.orbi-task-popup .otp-shell {
		flex-direction: column;
	}
}

`;

function toList(value) {
	if (Array.isArray(value)) return value;
	return String(value ?? "")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

// The popup is a widget whose PARTS are widgets. Properties and comments arrive through
// slots, so either can be swapped for another implementation from the board's config
// without this file changing — the same mechanism the board uses for its card.
export default createWidget(function OrbiTaskPopup({ settings, slots, data, actions, context }) {
	const rows = data?.tasks?.rows ?? [];
	const task = rows[0] ?? null;
	const write = actions?.tasks;
	const Properties = slots?.properties;
	const Comments = slots?.comments;

	if (!task) {
		return (
			<WidgetRoot className="orbi orbi-task-popup" defaultBackgroundType="fill" background="var(--orbi-neutral-0)">
				<style>{CSS}</style>
				<p class="otp-empty">Open a task from the board to see it here.</p>
			</WidgetRoot>
		);
	}

	const props = task.props ?? {};
	const setProperty = (field, value) => write?.update?.({ path: task.path }, { props: { [field]: value } });

	return (
		<WidgetRoot className="orbi orbi-task-popup" defaultBackgroundType="fill" background="var(--orbi-neutral-0)">
			<style>{CSS}</style>
			<div class="otp-shell">
				<div class="otp-main">
					<div class="otp-title-row">
						<span class="otp-title">{props.title ?? "Untitled"}</span>
						{props.priority ? (
							<span class="otp-chip" data-kind="priority">
								{props.priority}
							</span>
						) : null}
						{props.approval ? (
							<span class="otp-chip" data-kind="approval">
								{props.approval}
							</span>
						) : null}
					</div>
					<span class="otp-sub">{`List: ${props.status ?? "—"} · Board: ${props.board ?? "—"}`}</span>

					{Properties ? (
						<div>
							<div class="otp-section-title">Properties</div>
							<Properties task={task} onChange={setProperty} />
						</div>
					) : null}

					{Comments ? <Comments task={task} /> : null}
				</div>

				<aside class="otp-side">
					{toList(settings.actions).map((label) => (
						<button type="button" class="otp-action" key={label}>
							<span class="otp-action-mark" />
							<span>{label}</span>
						</button>
					))}
				</aside>
			</div>
		</WidgetRoot>
	);
});
