import { createElement as h } from "react";
import type { ReactElement } from "react";
import {
	Avatar,
	AvatarFallback,
	Button,
	Icon,
	Message,
	MessageAvatar,
	MessageContent,
	MessageFooter,
	MessageHeader,
	MessageParts,
} from "../../index";
import type { DemoMessage } from "./chat-messages";

export function DemoTurn({ message }: { readonly message: DemoMessage }): ReactElement {
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
						<Button variant="ghost" size="icon-sm" aria-label="Copy">
							<Icon name="copy" />
						</Button>
						<Button variant="ghost" size="icon-sm" aria-label="Good answer">
							<Icon name="thumbs-up" />
						</Button>
					</MessageFooter>
				)}
			</MessageContent>
		</Message>
	);
}
