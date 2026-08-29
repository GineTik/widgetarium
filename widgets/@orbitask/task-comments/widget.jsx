import { createWidget, WidgetRoot } from "widgetarium";
import { useState } from "preact/hooks";

const CSS = `
.orbi-comments .oc-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.orbi-comments .oc-title { font: var(--orbi-label-xs); color: var(--orbi-neutral-800); }
.orbi-comments svg { width: 18px; height: 18px; flex: none; color: var(--orbi-neutral-700); }

.orbi-comments .oc-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px; }

.orbi-comments .oc-item {
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding: 10px 12px;
	border-radius: var(--orbi-radius-sm);
	background: var(--orbi-neutral-25);
}

.orbi-comments .oc-author { font: var(--orbi-label-2xs); color: var(--orbi-neutral-800); }
.orbi-comments .oc-body { font: var(--orbi-body-xs); color: var(--orbi-neutral-700); }
.orbi-comments .oc-empty { margin: 0 0 12px; font: var(--orbi-body-xs); color: var(--orbi-neutral-400); }

.orbi-comments .oc-input {
	width: 100%;
	min-height: 64px;
	padding: 12px;
	border: none;
	border-radius: var(--orbi-radius-sm);
	background: var(--orbi-neutral-0);
	font: var(--orbi-body-xs);
	color: var(--orbi-neutral-950);
	resize: vertical;
}

.orbi-comments .oc-input:focus { outline: none; border-color: var(--orbi-primary-500); }


@container widget (width < 260px) {
	.orbi-comments .oc-head {
		flex-wrap: wrap;
	}
}

`;

function CommentIcon() {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-5.5A8 8 0 1 1 21 12Z" />
		</svg>
	);
}

// Comments live in the note's BODY, not its frontmatter — a property is one value, a
// conversation is a list that grows. The engine appends; this only shows and collects.
export default createWidget(function OrbiTaskComments({ settings, task, onAdd }) {
	const [draft, setDraft] = useState("");
	const comments = task?.comments ?? [];

	const send = () => {
		const trimmed = draft.trim();
		if (!trimmed || !onAdd) return;
		onAdd(trimmed);
		setDraft("");
	};

	return (
		<WidgetRoot defaultRounded="none" className="orbi orbi-comments" defaultBackgroundType="none">
			<style>{CSS}</style>
			<div class="oc-head">
				<CommentIcon />
				<span class="oc-title">Comments</span>
			</div>

			{comments.length === 0 ? (
				<p class="oc-empty">No comments yet.</p>
			) : (
				<div class="oc-list">
					{comments.map((comment, index) => (
						<article class="oc-item" key={index}>
							<span class="oc-author">{comment.author ?? "Someone"}</span>
							<span class="oc-body">{comment.body ?? String(comment)}</span>
						</article>
					))}
				</div>
			)}

			<textarea
				class="oc-input"
				placeholder={settings.placeholder}
				value={draft}
				onInput={(event) => setDraft(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) send();
				}}
			/>
		</WidgetRoot>
	);
});
