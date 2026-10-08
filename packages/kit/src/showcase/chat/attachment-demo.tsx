import { createElement as h } from "react";
import type { ReactElement } from "react";
import {
	Attachment,
	AttachmentAction,
	AttachmentActions,
	AttachmentContent,
	AttachmentDescription,
	AttachmentGroup,
	AttachmentMedia,
	AttachmentTitle,
	Icon,
	Shape,
} from "../../index";

export function AttachmentDemo(): ReactElement {
	return (
		<div className="wg-showcase-stack">
			<AttachmentGroup role="group" aria-label="Attached files" tabIndex={0}>
				<Attachment state="uploading">
					<AttachmentMedia>
						<Icon name="file-text" />
					</AttachmentMedia>
					<AttachmentContent>
						<AttachmentTitle>brief.pdf</AttachmentTitle>
						<AttachmentDescription>Uploading…</AttachmentDescription>
					</AttachmentContent>
					<AttachmentActions>
						<AttachmentAction aria-label="Remove brief.pdf">
							<Icon name="x" />
						</AttachmentAction>
					</AttachmentActions>
				</Attachment>
				<Attachment state="error" size="sm">
					<AttachmentMedia>
						<Icon name="image" />
					</AttachmentMedia>
					<AttachmentContent>
						<AttachmentTitle>cover.png</AttachmentTitle>
						<AttachmentDescription>Too large: 24 MB of 10 MB</AttachmentDescription>
					</AttachmentContent>
				</Attachment>
			</AttachmentGroup>
			<Attachment orientation="vertical">
				<AttachmentMedia variant="image">
					<Shape name="soft-burst" seed="moodboard" size={96} />
				</AttachmentMedia>
				<AttachmentContent>
					<AttachmentTitle>moodboard.png</AttachmentTitle>
					<AttachmentDescription>1.2 MB</AttachmentDescription>
				</AttachmentContent>
			</Attachment>
		</div>
	);
}
