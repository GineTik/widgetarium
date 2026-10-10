import { createElement as h, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { ReactElement, ReactNode } from "react";
import { Button } from "@widgetarium/kit";
import type { ChatCards } from "@widgetarium/core/engine/assistant-cards.js";
import type {
	AssistantCall,
	AssistantPort,
	AssistantSession,
	AssistantSetup,
	CallFace,
} from "@widgetarium/core/engine/assistant-port.js";
import type { OpenByBuild } from "./cards/build-progress.js";
import type { Attachment } from "./cards/change-attachment.js";
import { JobsStrip } from "./cards/jobs-strip.js";
import { scrollToCard } from "./cards/pinned-run.js";
import { cardsAround, pinnedCardOf } from "./cards/turn-cards.js";
import type { CardAsks } from "./cards/turn-cards.js";
import { ChatHead } from "./chat-head.js";
import { Composer } from "./composer.js";
import { EmptyChat } from "./empty-chat.js";
import { FailureSaid, useFailureLine } from "./failure-line.js";
import type { Report } from "./failure-line.js";
import { ToEndButton, useStuckToEnd } from "./stuck-scroll.js";
import { Turn } from "./turn.js";
import { Working } from "./working.js";

export interface ReadyChatProps {
	readonly port: AssistantPort;
	readonly setup: AssistantSetup;
	readonly setupFailure: string | null;
}

interface ChatAsks extends CardAsks {
	send(said: string): Promise<boolean>;
}

interface ScrollDraw {
	readonly port: AssistantPort;
	readonly session: AssistantSession;
	readonly setup: AssistantSetup;
	readonly cards: ChatCards;
	readonly asks: CardAsks;
}

const RETRY = "Try again";
const NOT_SENT = "the message could not be sent";
const NOT_BUILT = "the build could not be started";
const NOT_APPROVED = "the design could not be approved";

export function ReadyChat({ port, setup, setupFailure }: ReadyChatProps): ReactElement {
	const session = useSyncExternalStore(port.onSession, port.session);
	const cards = useMemo(() => port.cardsOf(session), [port, session]);
	const { scroller, isStuck, onScroll, toEnd } = useStuckToEnd([session.turns, session.busy]);
	const [openByBuild] = useState<OpenByBuild>(() => new Map());
	const [attachment, setAttachment] = useState<Attachment | null>(null);
	const { failure, report } = useFailureLine();
	const asks = chatAsksOf({ port, report, attachment, setAttachment });
	const chatRoot = useRef<HTMLDivElement>(null);
	const showCard = (key: string): void => scrollToCard(chatRoot.current, key);
	const pinned = pinnedCardOf(cards.pinned, { port, openByBuild, showCard });
	return h("div", { className: "wg-studio-ai", ref: chatRoot }, [
		h(ChatHead, { key: "head", port, setup, report }),
		h("div", { className: "wg-studio-ai-scroll-frame", key: "scroll" }, [
			h(
				"div",
				{ className: "wg-studio-ai-scroll", key: "scroll", ref: scroller, onScroll },
				scrollOf({ port, session, setup, cards, asks }),
			),
			isStuck ? null : h(ToEndButton, { key: "end", toEnd }),
		]),
		pinned ? h("div", { className: "wg-studio-ai-pinned", key: "pinned" }, pinned) : null,
		h(JobsStrip, { key: "strip", jobs: port, showCard }),
		h(FailureSaid, { key: "failure", failure: failure ?? setupFailure }),
		h(Composer, {
			key: "composer",
			busy: session.busy,
			note: setup.note,
			attached: attachment ? { label: attachment.label, onClear: () => setAttachment(null) } : null,
			onSend: asks.send,
			onStop: () => port.stop(),
		}),
	]);
}

interface AskHolder {
	readonly port: AssistantPort;
	readonly report: Report;
	readonly attachment: Attachment | null;
	readonly setAttachment: (next: (held: Attachment | null) => Attachment | null) => void;
}

function chatAsksOf({ port, report, attachment, setAttachment }: AskHolder): ChatAsks {
	const detached = (running: () => Promise<void>, said: string): void => {
		setAttachment(() => null);
		void report(running(), said).then((isDone) => {
			if (!isDone) setAttachment((held) => held ?? attachment);
		});
	};
	return {
		port,
		report,
		attach: (next) => setAttachment(() => next),
		buildIt: (app) => detached(() => port.buildIt(app), NOT_BUILT),
		approveDesign: (app) => detached(() => port.approveDesign(app), NOT_APPROVED),
		send: async (said) => {
			setAttachment(() => null);
			const isSent = await report(port.send(attachment ? attachment.rewrite(said) : said), NOT_SENT);
			if (!isSent) setAttachment((held) => held ?? attachment);
			return isSent;
		},
	};
}

function scrollOf({ port, session, setup, cards, asks }: ScrollDraw): ReactNode {
	if (session.turns.length === 0)
		return h(EmptyChat, { key: "empty", setup, onOpenProviders: () => port.openProviders() });
	const lastAt = session.turns.length - 1;
	const describe = (call: AssistantCall): CallFace => port.describeCall(call);
	return [
		...session.turns.flatMap((turn, at) => {
			const { before, after } = cardsAround(cards, { at, isAnswerable: at === lastAt && !session.busy }, asks);
			const live = session.busy && at === lastAt;
			return [...before, h(Turn, { key: at, turn, render: setup.renderMarkdown, describe, live }), ...after];
		}),
		session.busy ? h(Working, { key: "busy", session }) : null,
		session.failure ? failureOf(port, session.failure) : null,
	];
}

function failureOf(port: AssistantPort, failure: string): ReactElement {
	return h("div", { className: "wg-studio-ai-failure", key: "failure" }, [
		h("span", { className: "wg-studio-ai-failure-said", key: "said" }, failure),
		h(Button, { key: "retry", variant: "neutral", size: "s", onClick: () => port.retry() }, RETRY),
	]);
}
