import { createWidget, WidgetRoot } from "widgetarium";

const CSS = `
.orbi-task-props .otp-list { display: flex; flex-direction: column; gap: 12px; }

.orbi-task-props .otp-row {
	display: grid;
	grid-template-columns: 96px 1fr;
	align-items: center;
	gap: 12px;
}

.orbi-task-props .otp-name {
	font: var(--orbi-body-xs);
	color: var(--orbi-neutral-500);
	text-transform: capitalize;
}

.orbi-task-props .otp-value {
	font: var(--orbi-body-sm);
	color: var(--orbi-neutral-950);
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.orbi-task-props .otp-input {
	width: 100%;
	padding: 6px 8px;
	border: none;
	border-radius: var(--orbi-radius-sm);
	background: var(--orbi-neutral-0);
	font: var(--orbi-body-sm);
	color: var(--orbi-neutral-950);
}

.orbi-task-props .otp-input:focus { outline: none; border-color: var(--orbi-primary-500); }
.orbi-task-props .otp-empty { font: var(--orbi-body-sm); color: var(--orbi-neutral-500); margin: 0; }


@container widget (width < 260px) {
	.orbi-task-props .otp-row {
		flex-direction: column;
		align-items: flex-start;
		gap: 2px;
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

// These ARE the note's Obsidian properties. Editing one writes frontmatter through the
// engine — the same call the board makes when a card is dragged to another column, so the
// two can never disagree about what a task's status is.
export default createWidget(function OrbiTaskProperties({ settings, task, onChange }) {
	const fields = toList(settings.fields);
	const props = task?.props ?? {};

	if (!task) {
		return (
			<WidgetRoot defaultRounded="none" className="orbi orbi-task-props" defaultBackgroundType="none">
				<style>{CSS}</style>
				<p class="otp-empty">Select a task to see its properties.</p>
			</WidgetRoot>
		);
	}

	return (
		<WidgetRoot defaultRounded="none" className="orbi orbi-task-props" defaultBackgroundType="none">
			<style>{CSS}</style>
			<div class="otp-list">
				{fields.map((field) => (
					<label class="otp-row" key={field}>
						<span class="otp-name">{field}</span>
						{onChange ? (
							<input
								class="otp-input"
								value={props[field] ?? ""}
								onChange={(event) => onChange(field, event.target.value)}
							/>
						) : (
							<span class="otp-value">{String(props[field] ?? "—")}</span>
						)}
					</label>
				))}
			</div>
		</WidgetRoot>
	);
});
