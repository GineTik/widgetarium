import { textOf } from "widgetarium";
import type { RecordRef } from "widgetarium";
import { EMOJI_PREFIX } from "@default/lib";

export type Picture =
	| { kind: "letters"; letters: string }
	| { kind: "emoji"; name: string; letters: string }
	| { kind: "remote"; src: string; letters: string }
	| { kind: "vault"; markdown: string; letters: string };

const CARD_SIZE_FLOOR = 32;
const CARD_SIZE_CEILING = 160;
const CARD_SIZE_DEFAULT = 64;
const WEB_ADDRESS = /^https?:\/\//i;
const ALREADY_AN_EMBED = /^!\[/;

export function nameOf(card: unknown): string {
	return (textOf(card, "name") || textOf(card, "title")).trim();
}

export function pictureOf(card: unknown): Picture {
	const letters = lettersOf(nameOf(card));
	const written = textOf(card, "picture").trim();
	if (!written) return { kind: "letters", letters };
	if (written.startsWith(EMOJI_PREFIX)) return { kind: "emoji", name: written.slice(EMOJI_PREFIX.length), letters };
	if (WEB_ADDRESS.test(written)) return { kind: "remote", src: written, letters };
	return { kind: "vault", markdown: ALREADY_AN_EMBED.test(written) ? written : `![[${written}]]`, letters };
}

export function cardSizeOf(value: unknown): number {
	const held = Number(value);
	if (!Number.isFinite(held)) return CARD_SIZE_DEFAULT;
	return Math.max(CARD_SIZE_FLOOR, Math.min(CARD_SIZE_CEILING, Math.round(held)));
}

export function rowsOf<T>(values: readonly T[] | null | undefined): { ref: RecordRef; value: T }[] {
	return (values ?? []).map((value, at) => ({ ref: `seed${at}` as RecordRef, value }));
}

function lettersOf(name: string): string {
	const words = name.split(/[\s_-]+/).filter(Boolean);
	const [first, second] = words;
	if (first === undefined) return "?";
	if (second === undefined) return first.slice(0, 2).toUpperCase();
	return `${first[0] ?? ""}${second[0] ?? ""}`.toUpperCase();
}
