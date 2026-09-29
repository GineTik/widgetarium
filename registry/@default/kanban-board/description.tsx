import { MarkdownEditor } from "widgetarium/kit";
import { useState } from "react";
import { DescriptionHead } from "./description-head";
import { DETAIL, PREVIEW } from "./description-modes";
import { Preview } from "./preview";
import { RefusedNotice } from "./refused-notice";
import type { DescriptionProps } from "./types";
import { useNoteBody } from "./use-note-body";

export function Description({ path, read, write, render, canPreview, canEdit }: DescriptionProps) {
	const [wanted, setWanted] = useState(PREVIEW);
	const [isSwitched, setSwitched] = useState(false);
	const body = useNoteBody({ path, read, write });

	const offered = modesOffered(canPreview, canEdit);
	const [firstOffered] = offered;
	if (!firstOffered) return null;
	const mode = offered.includes(wanted) ? wanted : firstOffered;

	return (
		<div className="otd-desc" onBlur={body.save}>
			<DescriptionHead
				offered={offered}
				mode={mode}
				onChange={(next: string) => {
					setWanted(next);
					setSwitched(true);
				}}
			/>
			<RefusedNotice isRefused={body.isRefused} />
			{mode === PREVIEW ? (
				<Preview markdown={body.draft} render={render} />
			) : (
				<MarkdownEditor
					className="otd-editor"
					value={body.draft}
					placeholder="Say what this is"
					onInput={body.setDraft}
					focusAtStart={isSwitched}
				/>
			)}
		</div>
	);
}

function modesOffered(canPreview: boolean, canEdit: boolean): string[] {
	const offered: string[] = [];
	if (canPreview) offered.push(PREVIEW);
	if (canEdit) offered.push(DETAIL);
	return offered;
}
