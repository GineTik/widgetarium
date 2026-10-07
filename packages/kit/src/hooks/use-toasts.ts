import { useEffect, useState } from "react";
import { TOAST_QUEUE } from "../utils/toast-queue";
import type { ToastRecord } from "../utils/toast-queue";

export function useToasts(): readonly ToastRecord[] {
	const [records, setRecords] = useState(TOAST_QUEUE.read());
	useEffect(() => {
		setRecords(TOAST_QUEUE.read());
		return TOAST_QUEUE.subscribe(() => setRecords(TOAST_QUEUE.read()));
	}, []);
	return records;
}
