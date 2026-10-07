import { createElement as h, useState } from "react";
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
	Avatar,
	AvatarFallback,
	Bubble,
	BubbleContent,
	BubbleGroup,
	BubbleReactions,
	Button,
	Icon,
	IconButton,
	Message,
	MessageAvatar,
	MessageContent,
	MessageFooter,
	MessageHeader,
	MessageParts,
	MessageScroller,
	MessageScrollerButton,
	MessageScrollerContent,
	MessageScrollerItem,
	MessageScrollerProvider,
	MessageScrollerViewport,
	Questionnaire,
	QuestionnaireActions,
	QuestionnaireChoice,
	QuestionnaireChoices,
	QuestionnaireDescription,
	QuestionnaireError,
	QuestionnaireInput,
	QuestionnaireItem,
	QuestionnaireNext,
	QuestionnairePrevious,
	QuestionnaireProgress,
	QuestionnaireSkip,
	QuestionnaireSubmit,
	QuestionnaireTitle,
	Shape,
} from "../packages/kit/src/index";
import type { BubbleVariant, ChatPartLike } from "../packages/kit/src/index";
import { Named } from "./kit-demo-frame.tsx";

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

interface DemoPart extends ChatPartLike {
	readonly [field: string]: unknown;
}

interface DemoMessage {
	readonly id: string;
	readonly role: "user" | "assistant";
	readonly parts: readonly DemoPart[];
}

const OPENING: readonly DemoMessage[] = [
	{ id: "m1", role: "user", parts: [{ type: "text", text: "Which notes did I tag #launch this week?" }] },
	{
		id: "m2",
		role: "assistant",
		parts: [
			{ type: "reasoning", text: "Search the vault for the tag, then group by day.", state: "done" },
			{
				type: "tool-searchVault",
				toolCallId: "c1",
				state: "output-available",
				input: { tag: "launch", since: "2026-10-01" },
				output: { found: 4 },
			},
			{ type: "text", text: "Four notes: the brief, two meeting notes and the checklist." },
		],
	},
	{
		id: "m3",
		role: "user",
		parts: [
			{ type: "text", content: "Draft the announcement from the brief." },
			{
				type: "document",
				source: { type: "url", value: "https://example.com/brief.pdf", mimeType: "application/pdf" },
			},
		],
	},
	{
		id: "m4",
		role: "assistant",
		parts: [
			{ type: "thinking", content: "Lead with the date, keep it short." },
			{
				type: "tool-call",
				id: "c2",
				name: "readNote",
				arguments: '{"path":"Launch/Brief.md"}',
				state: "input-complete",
			},
			{ type: "tool-result", toolCallId: "c2", content: "1 200 words", state: "complete" },
			{
				type: "text",
				content: "Here is a first draft. The launch lands on the 14th, with the waitlist opening a week before.",
			},
		],
	},
];

const VARIANTS: readonly BubbleVariant[] = [
	"default",
	"secondary",
	"muted",
	"tinted",
	"outline",
	"ghost",
	"destructive",
];

export function ChatDemo(): ReactElement {
	const [messages, setMessages] = useState(OPENING);
	const reply = (): void =>
		setMessages((was) => [
			...was,
			{ id: `u${was.length}`, role: "user", parts: [{ type: "text", text: "One more line, please." }] },
			{
				id: `a${was.length}`,
				role: "assistant",
				parts: [{ type: "text", text: "Added a closing line with the link." }],
			},
		]);
	return (
		<div className="demo-stack">
			<div className="demo-chat" style={{ height: 460, display: "flex", flexDirection: "column" }}>
				<MessageScrollerProvider autoScroll>
					<MessageScroller>
						<MessageScrollerViewport>
							<MessageScrollerContent>
								{messages.map((message) => (
									<MessageScrollerItem key={message.id} messageId={message.id} scrollAnchor={message.role === "user"}>
										<DemoTurn message={message} />
									</MessageScrollerItem>
								))}
							</MessageScrollerContent>
						</MessageScrollerViewport>
						<MessageScrollerButton />
					</MessageScroller>
				</MessageScrollerProvider>
			</div>
			<div className="demo-row">
				<Button variant="default" onClick={reply}>
					Send another turn
				</Button>
			</div>
		</div>
	);
}

function DemoTurn({ message }: { readonly message: DemoMessage }): ReactElement {
	const isUser = message.role === "user";
	return (
		<Message align={isUser ? "end" : "start"}>
			{isUser ? null : (
				<MessageAvatar>
					<Avatar size="s" label="Assistant">
						<AvatarFallback>AI</AvatarFallback>
					</Avatar>
				</MessageAvatar>
			)}
			<MessageContent>
				{isUser ? null : <MessageHeader>Assistant · 2m</MessageHeader>}
				<MessageParts parts={message.parts} variant={isUser ? "default" : "secondary"} />
				{isUser ? null : (
					<MessageFooter>
						<IconButton variant="ghost" size="s" label="Copy">
							<Icon name="copy" />
						</IconButton>
						<IconButton variant="ghost" size="s" label="Good answer">
							<Icon name="thumbs-up" />
						</IconButton>
					</MessageFooter>
				)}
			</MessageContent>
		</Message>
	);
}

export function BubbleDemo(): ReactElement {
	return (
		<div className="demo-stack">
			{VARIANTS.map((variant) => (
				<Named key={variant} name={variant}>
					<Bubble variant={variant}>
						<BubbleContent>The draft is ready for review.</BubbleContent>
					</Bubble>
				</Named>
			))}
			<Named name="BubbleGroup · BubbleReactions · align end">
				<BubbleGroup>
					<Bubble align="end">
						<BubbleContent>Shipped on Friday.</BubbleContent>
					</Bubble>
					<Bubble align="end">
						<BubbleContent render={<button type="button" />}>Open the release note</BubbleContent>
						<BubbleReactions role="img" aria-label="Two thumbs up">
							<Icon name="thumbs-up" size={12} /> 2
						</BubbleReactions>
					</Bubble>
				</BubbleGroup>
			</Named>
		</div>
	);
}

export function AttachmentDemo(): ReactElement {
	return (
		<div className="demo-stack">
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

export function QuestionnaireDemo(): ReactElement {
	const [sent, setSent] = useState("");
	return (
		<div className="demo-stack">
			<Questionnaire
				shortcuts="letters"
				onSubmit={(event) => {
					event.preventDefault();
					setSent(JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))));
				}}
			>
				<QuestionnaireProgress />
				<QuestionnaireItem name="pace" required>
					<QuestionnaireTitle>How fast should the board refresh?</QuestionnaireTitle>
					<QuestionnaireDescription>Pick the one that matches how you work.</QuestionnaireDescription>
					<QuestionnaireChoices>
						<QuestionnaireChoice value="live" description="Every change shows at once">
							Live
						</QuestionnaireChoice>
						<QuestionnaireChoice value="hourly">Every hour</QuestionnaireChoice>
						<QuestionnaireChoice value="daily">Once a day</QuestionnaireChoice>
						<QuestionnaireInput aria-label="Describe another" placeholder="Describe another…" />
					</QuestionnaireChoices>
					<QuestionnaireError />
				</QuestionnaireItem>
				<QuestionnaireItem name="views" multiple>
					<QuestionnaireTitle>Which views do you open most?</QuestionnaireTitle>
					<QuestionnaireDescription>Pick as many as you like, or skip.</QuestionnaireDescription>
					<QuestionnaireChoices>
						<QuestionnaireChoice value="board">Board</QuestionnaireChoice>
						<QuestionnaireChoice value="calendar">Calendar</QuestionnaireChoice>
						<QuestionnaireChoice value="list">List</QuestionnaireChoice>
					</QuestionnaireChoices>
					<QuestionnaireError />
				</QuestionnaireItem>
				<QuestionnaireItem name="note" required>
					<QuestionnaireTitle>Anything else?</QuestionnaireTitle>
					<QuestionnaireChoices>
						<QuestionnaireInput aria-label="Your note" placeholder="Write a line…" />
					</QuestionnaireChoices>
					<QuestionnaireError />
				</QuestionnaireItem>
				<QuestionnaireActions>
					<QuestionnairePrevious />
					<QuestionnaireSkip />
					<QuestionnaireNext />
					<QuestionnaireSubmit />
				</QuestionnaireActions>
			</Questionnaire>
			{sent ? <p className="demo-code">{sent}</p> : null}
		</div>
	);
}
