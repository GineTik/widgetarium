export const CHAT_USAGE = {
	chat: `import { MessageScrollerProvider, MessageScroller, MessageScrollerViewport,
	MessageScrollerContent, MessageScrollerItem, MessageScrollerButton,
	Message, MessageAvatar, MessageContent, MessageHeader, MessageParts } from "widgetarium/kit";

<MessageScrollerProvider autoScroll>
	<MessageScroller>
		<MessageScrollerViewport>
			<MessageScrollerContent aria-busy={isStreaming}>
				{messages.map((message) => (
					<MessageScrollerItem key={message.id} messageId={message.id} scrollAnchor={message.role === "user"}>
						<Message align={message.role === "user" ? "end" : "start"}>
							<MessageContent>
								<MessageParts parts={message.parts} />
							</MessageContent>
						</Message>
					</MessageScrollerItem>
				))}
			</MessageScrollerContent>
		</MessageScrollerViewport>
		<MessageScrollerButton />
	</MessageScroller>
</MessageScrollerProvider>`,
	bubble: `<Bubble variant="tinted">
	<BubbleContent>Shipped on Friday.</BubbleContent>
	<BubbleReactions role="img" aria-label="Two thumbs up">👍 2</BubbleReactions>
</Bubble>`,
	attachment: `<Attachment state="uploading">
	<AttachmentMedia><Icon name="file-text" /></AttachmentMedia>
	<AttachmentContent>
		<AttachmentTitle>brief.pdf</AttachmentTitle>
		<AttachmentDescription>Uploading…</AttachmentDescription>
	</AttachmentContent>
	<AttachmentActions>
		<AttachmentAction aria-label="Remove brief.pdf"><Icon name="x" /></AttachmentAction>
	</AttachmentActions>
</Attachment>`,
	questionnaire: `<Questionnaire shortcuts="letters" onSubmit={(event) => {
	event.preventDefault();
	const answers = new FormData(event.currentTarget);
}}>
	<QuestionnaireProgress />
	<QuestionnaireItem name="pace" required>
		<QuestionnaireTitle>How fast should the board refresh?</QuestionnaireTitle>
		<QuestionnaireDescription>Pick one.</QuestionnaireDescription>
		<QuestionnaireChoices>
			<QuestionnaireChoice value="live">Live</QuestionnaireChoice>
			<QuestionnaireChoice value="hourly">Every hour</QuestionnaireChoice>
			<QuestionnaireInput aria-label="Describe another" placeholder="Describe another…" />
		</QuestionnaireChoices>
		<QuestionnaireError />
	</QuestionnaireItem>
	<QuestionnaireActions>
		<QuestionnairePrevious /><QuestionnaireSkip /><QuestionnaireNext /><QuestionnaireSubmit />
	</QuestionnaireActions>
</Questionnaire>`,
};
