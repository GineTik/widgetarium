import { createElement as h, useEffect, useRef, useState } from "react";
import { Button, Icon, IconButton, Popover, PopoverItem, PopoverSeparator } from "../kit.js";
import { failuresIn, glyphOf, glyphsOf, hintOf, titleOf } from "./tools.js";
import { Said } from "./markdown.js";
import { saidProgress } from "./spent.js";

const TITLE = "Widgetarium AI";
const PLACEHOLDER = "Ask for a screen, a widget, or a change to this note.";
const EMPTY_LEAD = "Tell me what this screen should do.";
const EMPTY_SAID = "I will find the widgets, put them on the board one at a time, and bind them to your notes.";
const CONFIGURE = "Configure providers";
const CLEAR = "Clear context";
const CHAT_ONLY = "chat only";
const SEND = "Send";
const STOP = "Stop";
const MENU = "Provider and context";
const RETRY = "Try again";
const NO_PROVIDER_LEAD = "{label} is not on this machine yet.";
const NO_PROVIDER_SAID =
	"Install it, or pick a provider that is already here. Everything on the list runs locally and is free to use.";
const SET_UP = "Set up a provider";
const STILL_BUILDING = "Still building — what you can see is not finished yet.";
const NO_NOTE = "No note open";
const TALLEST_BOX_PX = 120;
const TICK_MS = 1000;
const OWN_RISK = "AI can make mistakes. It edits files in your vault, and you take on whatever it changes.";
const USED_ONE = "Used 1 tool";
const USED_MANY = "Used {count} tools";
const SOME_FAILED = "{count} failed";
const INPUT = "Input";
const OUTPUT = "Output";
const MOST_GLYPHS = 5;

function CallDetail({ label, said }) {
	return h("div", { className: "wg-ai-call-part" }, [
		h("span", { className: "wg-ai-call-part-label", key: "label" }, label),
		h("pre", { className: "wg-ai-call-part-said", key: "said" }, said),
	]);
}

function CallRow({ call, isOpen, onToggle }) {
	const shown = JSON.stringify(call.input, null, "\t");
	const canOpen = shown !== "{}" || call.output !== "";
	return h("div", { className: call.failed ? "wg-ai-call is-failed" : "wg-ai-call" }, [
		h("span", { className: "wg-ai-call-rail", key: "rail" }, h(Icon, { name: glyphOf(call), size: 14 })),
		h("div", { className: "wg-ai-call-body", key: "body" }, [
			h(
				"button",
				{ className: "wg-ai-call-head", key: "head", type: "button", disabled: !canOpen, onClick: onToggle },
				[
					h("span", { className: "wg-ai-call-name", key: "name" }, titleOf(call)),
					canOpen
						? h(Icon, {
								key: "mark",
								name: "chevron",
								size: 12,
								className: isOpen ? "wg-ai-turn-mark is-open" : "wg-ai-turn-mark",
							})
						: null,
				],
			),
			hintOf(call) === "" ? null : h("p", { className: "wg-ai-call-hint", key: "hint" }, hintOf(call)),
			isOpen && canOpen
				? h("div", { className: "wg-ai-call-open", key: "open" }, [
						shown === "{}" ? null : h(CallDetail, { key: "in", label: INPUT, said: shown }),
						call.output === "" ? null : h(CallDetail, { key: "out", label: OUTPUT, said: call.output }),
					])
				: null,
		]),
	]);
}

function ToolCalls({ calls }) {
	const [isOpen, setOpen] = useState(false);
	const [openCalls, setOpenCalls] = useState(() => new Set());
	const failed = failuresIn(calls);

	const toggleCall = (at) =>
		setOpenCalls((held) => {
			const next = new Set(held);
			if (next.has(at)) next.delete(at);
			else next.add(at);
			return next;
		});

	return h("div", { className: "wg-ai-tools" }, [
		h("button", { className: "wg-ai-tools-head", key: "head", type: "button", onClick: () => setOpen(!isOpen) }, [
			h(
				"span",
				{ className: "wg-ai-tools-marks", key: "marks" },
				glyphsOf(calls, MOST_GLYPHS).map((glyph, at) =>
					h(
						"span",
						{ className: "wg-ai-tools-mark", key: glyph, style: { zIndex: at } },
						h(Icon, { name: glyph, size: 13 }),
					),
				),
			),
			h(
				"span",
				{ className: "wg-ai-tools-said", key: "said" },
				calls.length === 1 ? USED_ONE : USED_MANY.replace("{count}", String(calls.length)),
			),
			failed === 0
				? null
				: h("span", { className: "wg-ai-tools-failed", key: "failed" }, SOME_FAILED.replace("{count}", String(failed))),
			h(Icon, {
				key: "mark",
				name: "chevron",
				size: 12,
				className: isOpen ? "wg-ai-turn-mark is-open" : "wg-ai-turn-mark",
			}),
		]),
		isOpen
			? h(
					"div",
					{ className: "wg-ai-tools-list", key: "list" },
					calls.map((call, at) =>
						h(CallRow, { key: `${call.ref}-${at}`, call, isOpen: openCalls.has(at), onToggle: () => toggleCall(at) }),
					),
				)
			: null,
	]);
}

function Turn({ turn, host, live }) {
	const mine = turn.role === "user";
	return h("div", { className: mine ? "wg-ai-turn is-mine" : "wg-ai-turn" }, [
		turn.calls.length > 0 ? h(ToolCalls, { key: "tools", calls: turn.calls }) : null,
		turn.text === "" ? null : h(Said, { key: "said", text: turn.text, host: mine ? null : host, live }),
	]);
}

function EmptyChat({ ai, onOpenProviders }) {
	if (ai.ready) {
		return h("div", { className: "wg-ai-empty" }, [
			h(Icon, { key: "mark", name: "sparkle", size: 28 }),
			h("p", { className: "wg-ai-empty-lead", key: "lead" }, EMPTY_LEAD),
			h("p", { className: "wg-ai-empty-said", key: "said" }, EMPTY_SAID),
		]);
	}
	return h("div", { className: "wg-ai-empty" }, [
		h(Icon, { key: "mark", name: "gear", size: 28 }),
		h("p", { className: "wg-ai-empty-lead", key: "lead" }, NO_PROVIDER_LEAD.replace("{label}", ai.provider.label)),
		h("p", { className: "wg-ai-empty-said", key: "said" }, NO_PROVIDER_SAID),
		h(Button, { key: "set-up", variant: "accent", size: "m", onClick: onOpenProviders }, SET_UP),
	]);
}

function ProviderMenu({ ai, onChoose, onOpenProviders, onClear }) {
	const [isOpen, setOpen] = useState(false);
	const pick = (id) => {
		setOpen(false);
		onChoose(id);
	};
	return h(
		Popover,
		{
			isOpen,
			onOpenChange: setOpen,
			placement: "below",
			className: "wg-ai-menu",
			trigger: h(IconButton, { variant: "neutral", size: "s", "aria-label": MENU }, h(Icon, { name: "dots" })),
		},
		[
			...ai.providers.map((provider) =>
				h(
					PopoverItem,
					{ key: provider.id, checked: provider.id === ai.chosen, onClick: () => pick(provider.id) },
					provider.canEdit ? provider.label : `${provider.label} · ${CHAT_ONLY}`,
				),
			),
			h(PopoverSeparator, { key: "line" }),
			h(
				PopoverItem,
				{
					key: "configure",
					onClick: () => {
						setOpen(false);
						onOpenProviders();
					},
				},
				CONFIGURE,
			),
			h(
				PopoverItem,
				{
					key: "clear",
					onClick: () => {
						setOpen(false);
						onClear();
					},
				},
				CLEAR,
			),
		],
	);
}

function useTicking(on) {
	const [, tick] = useState(0);
	useEffect(() => {
		if (!on) return undefined;
		const timer = setInterval(() => tick((was) => was + 1), TICK_MS);
		return () => clearInterval(timer);
	}, [on]);
}

function Working({ state }) {
	useTicking(state.busy);
	return h("div", { className: "wg-ai-busy" }, [
		h(Icon, { key: "mark", name: "sparkle", size: 14, className: "wg-ai-busy-mark" }),
		h(
			"span",
			{ className: "wg-ai-busy-said", key: "said" },
			saidProgress({
				ms: state.startedAt ? Date.now() - state.startedAt : 0,
				spent: state.spent,
				phase: state.phase,
				tool: state.tool,
			}),
		),
		h("span", { className: "wg-ai-busy-warn", key: "warn" }, STILL_BUILDING),
	]);
}

export function sendState({ busy, hasInput }) {
	if (busy) return "streaming";
	return hasInput ? "typing" : "idle";
}

function TargetNote({ note }) {
	if (!note?.path) return h("span", { className: "wg-ai-target is-unset" }, NO_NOTE);
	return h("span", { className: "wg-ai-target" }, [
		h(Icon, { key: "mark", name: note.hasBoard ? "widget" : "pencil", size: 14 }),
		h("span", { className: "wg-ai-target-name", key: "name" }, note.path),
	]);
}

function Composer({ busy, note, onSend, onStop }) {
	const [draft, setDraft] = useState("");
	const composerBox = useRef(null);
	const state = sendState({ busy, hasInput: draft.trim() !== "" });

	const sendDraft = () => {
		const said = draft.trim();
		if (said === "" || busy) return;
		setDraft("");
		onSend(said);
	};

	const onKeyDown = (event) => {
		if (event.key !== "Enter" || event.shiftKey) return;
		event.preventDefault();
		sendDraft();
	};

	const focusBox = (event) => {
		if (event.target.closest("button, textarea")) return;
		composerBox.current?.focus();
	};

	useEffect(() => {
		const node = composerBox.current;
		if (!node) return;
		node.style.height = "auto";
		node.style.height = `${Math.min(TALLEST_BOX_PX, node.scrollHeight)}px`;
		node.style.overflowY = node.scrollHeight > TALLEST_BOX_PX ? "auto" : "hidden";
	}, [draft]);

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
				h(TargetNote, { key: "target", note }),
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

export function AiChat({ session, ai, onChoose, onOpenProviders }) {
	const [state, setState] = useState(() => session.now());
	const scroller = useRef(null);

	useEffect(() => session.watch(setState), [session]);

	useEffect(() => {
		const node = scroller.current;
		if (node) node.scrollTop = node.scrollHeight;
	}, [state.turns, state.busy]);

	return h("div", { className: "wg-ai" }, [
		h("header", { className: "wg-ai-head", key: "head" }, [
			h("span", { className: "wg-ai-title", key: "title" }, TITLE),
			h("span", { className: "wg-ai-who", key: "who" }, ai.provider.label),
			h(ProviderMenu, { key: "menu", ai, onChoose, onOpenProviders, onClear: () => session.clear() }),
		]),
		h(
			"div",
			{ className: "wg-ai-scroll", key: "scroll", ref: scroller },
			state.turns.length === 0
				? h(EmptyChat, { key: "empty", ai, onOpenProviders })
				: [
						...state.turns.map((turn, at) =>
							h(Turn, { key: at, turn, host: ai.host, live: state.busy && at === state.turns.length - 1 }),
						),
						state.busy ? h(Working, { key: "busy", state }) : null,
						state.failure
							? h("div", { className: "wg-ai-failure", key: "failure" }, [
									h("span", { className: "wg-ai-failure-said", key: "said" }, state.failure),
									h(Button, { key: "retry", variant: "neutral", size: "s", onClick: () => session.retry() }, RETRY),
								])
							: null,
					],
		),
		h(Composer, {
			key: "composer",
			busy: state.busy,
			note: ai.note,
			onSend: (said) => session.send(said),
			onStop: () => session.stop(),
		}),
	]);
}
