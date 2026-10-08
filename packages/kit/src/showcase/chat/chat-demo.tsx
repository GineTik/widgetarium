import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import {
	Button,
	MessageScroller,
	MessageScrollerButton,
	MessageScrollerContent,
	MessageScrollerItem,
	MessageScrollerProvider,
	MessageScrollerViewport,
} from "../../index";
import { OPENING } from "./chat-messages";
import { DemoTurn } from "./chat-turn";

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
		<div className="wg-showcase-stack">
			<div className="wg-showcase-chat" style={{ height: 460, display: "flex", flexDirection: "column" }}>
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
			<div className="wg-showcase-row">
				<Button variant="default" onClick={reply}>
					Send another turn
				</Button>
			</div>
		</div>
	);
}
