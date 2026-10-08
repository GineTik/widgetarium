import type { ChatPartLike } from "../../index";

export interface DemoPart extends ChatPartLike {
	readonly [field: string]: unknown;
}

export interface DemoMessage {
	readonly id: string;
	readonly role: "user" | "assistant";
	readonly parts: readonly DemoPart[];
}

export const OPENING: readonly DemoMessage[] = [
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
