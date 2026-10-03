import { createElement as h, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, ReactElement, RefObject } from "react";
import { Icon, IconButton } from "@widgetarium/kit";
import type { OpenNote } from "./assistant.js";
import { TargetNote } from "./target-note.js";
import { AttachedChip } from "./attached-chip.js";
import type { Attached } from "./attached-chip.js";

export type SendState = "streaming" | "typing" | "idle";

export interface ComposerProps {
	readonly busy: boolean;
	readonly note: OpenNote | null | undefined;
	readonly attached?: Attached | null;
	readonly onSend: (said: string) => void;
	readonly onStop: () => void;
}

const PLACEHOLDER = "Ask for a screen, a widget, or a change to this note.";
const SEND = "Send";
const STOP = "Stop";
const TALLEST_BOX_PX = 120;
const OWN_RISK = "AI can make mistakes. It edits files in your vault, and you take on whatever it changes.";

export function sendState({ busy, hasInput }: { readonly busy: boolean; readonly hasInput: boolean }): SendState {
	if (busy) return "streaming";
	return hasInput ? "typing" : "idle";
}

export function Composer({ busy, note, attached, onSend, onStop }: ComposerProps): ReactElement {
	const [draft, setDraft] = useState("");
	const composerBox = useRef<HTMLTextAreaElement>(null);
	const state = sendState({ busy, hasInput: draft.trim() !== "" });

	const sendDraft = (): void => {
		const said = draft.trim();
		if (said === "" || busy) return;
		setDraft("");
		onSend(said);
	};

	const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
		if (event.key !== "Enter" || event.shiftKey) return;
		event.preventDefault();
		sendDraft();
	};

	const focusBox = (event: MouseEvent<HTMLDivElement>): void => {
		if (event.target instanceof Element && event.target.closest("button, textarea")) return;
		composerBox.current?.focus();
	};

	useFitsDraft(composerBox, draft);
	useFocusesWhenAttached(composerBox, attached);

	return h("div", { className: "wg-ai-composer" }, [
		h("p", { className: "wg-ai-risk", key: "risk" }, OWN_RISK),
		h("div", { className: "wg-ai-well", key: "well", onClick: focusBox }, [
			h("textarea", {
				key: "box",
				ref: composerBox,
				className: "wg-ai-box",
				rows: 1,
				value: draft,
				placeholder: PLACEHOLDER,
				onChange: (event) => setDraft(event.target.value),
				onKeyDown,
			}),
			h("div", { className: "wg-ai-bar", key: "bar" }, [
				attached ? h(AttachedChip, { key: "attached", attached }) : h(TargetNote, { key: "target", note }),
				h(
					IconButton,
					{
						key: "act",
						variant: state === "idle" ? "neutral" : "accent",
						size: "s",
						disabled: state === "idle",
						"aria-label": state === "streaming" ? STOP : SEND,
						onClick: () => (state === "streaming" ? onStop() : sendDraft()),
					},
					h(Icon, { name: state === "streaming" ? "stop" : "arrow-up" }),
				),
			]),
		]),
	]);
}

function useFitsDraft(composerBox: RefObject<HTMLTextAreaElement | null>, draft: string): void {
	useEffect(() => {
		const node = composerBox.current;
		if (!node) return;
		node.style.height = "auto";
		node.style.height = `${Math.min(TALLEST_BOX_PX, node.scrollHeight)}px`;
		node.style.overflowY = node.scrollHeight > TALLEST_BOX_PX ? "auto" : "hidden";
	}, [composerBox, draft]);
}

function useFocusesWhenAttached(
	composerBox: RefObject<HTMLTextAreaElement | null>,
	attached: Attached | null | undefined,
): void {
	const label = attached?.label ?? null;
	useEffect(() => {
		if (label) composerBox.current?.focus();
	}, [composerBox, label]);
}
