import { useState } from "react";
import type { Draft, Listed, MetricProps } from "./types";
import { writeOrNotify } from "./write-or-notify";

const CANNOT_WRITE = "The record was not written, so the card still reads what it read before.";

export function useEntryDialog(today: string, records: MetricProps["records"], host: MetricProps["host"]) {
	const [asked, setAsked] = useState<string | null>(null);
	const [draft, setDraft] = useState<Draft>(() => emptyDraft(today));

	const openAdd = () => {
		setDraft(emptyDraft(today));
		setAsked("add");
	};

	const editRow = (row: Listed) => {
		setDraft({
			ref: row.ref,
			day: row.day,
			sign: row.amount < 0 ? "subtract" : "add",
			amount: String(Math.abs(row.amount)),
			note: row.note,
		});
		setAsked("add");
	};

	const confirmDraft = async () => {
		const write = draftWrite(records, draft);
		if (write && (await writeOrNotify(host, write, CANNOT_WRITE))) setAsked(null);
	};

	return { asked, setAsked, draft, setDraft, openAdd, editRow, confirmDraft };
}

const emptyDraft = (day: string): Draft => ({ ref: null, day, sign: "add", amount: "", note: "" });

function draftWrite(records: MetricProps["records"], draft: Draft) {
	const amount = Number(draft.amount);
	if (!Number.isFinite(amount)) return null;
	const signed = draft.sign === "subtract" ? -Math.abs(amount) : Math.abs(amount);
	const data = { date: draft.day, amount: signed, note: draft.note };
	return draft.ref ? records.update({ ref: draft.ref, data }) : records.create(data);
}
