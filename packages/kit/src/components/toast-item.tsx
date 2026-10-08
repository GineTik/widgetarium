import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { useReportsHeight } from "../hooks/use-reports-height";
import { cn } from "../utils/cn";
import type { ToastId, ToastRecord } from "../utils/toast-queue";
import type { ToastSpot } from "../utils/toast-stack";
import type { TokenStyle } from "../utils/token-style";
import { ToastClose } from "./toast-close";
import { ToastIcon } from "./toast-icon";
import { ToastPress } from "./toast-press";
import { ToastText } from "./toast-text";

export interface ToastItemProps {
	readonly record: ToastRecord;
	readonly spot: ToastSpot;
	readonly closeButton: boolean;
	readonly onHeight: (id: ToastId, height: number) => void;
}

interface ToastMarks {
	readonly role: "alert" | "status";
	readonly "data-slot": "toast";
	readonly "data-type": ToastRecord["type"];
	readonly "data-state": "open" | "closed";
	readonly "data-front": boolean;
	readonly "data-visible": boolean;
}

export function ToastItem({ record, spot, closeButton, onHeight }: ToastItemProps): ReactElement {
	const itemRef = useRef<HTMLLIElement>(null);
	useReportsHeight(itemRef, record.id, onHeight);
	return (
		<li
			ref={itemRef}
			{...toastMarks(record, spot)}
			className={cn("wg-kit-toast", record.className)}
			style={spotStyle(spot)}
		>
			<ToastIcon type={record.type} icon={record.icon} />
			<ToastText title={record.title} description={record.description} />
			{record.cancel ? <ToastPress button={record.cancel} id={record.id} variant="ghost" /> : null}
			{record.action ? <ToastPress button={record.action} id={record.id} variant="default" /> : null}
			{closeButton || record.closeButton ? <ToastClose id={record.id} /> : null}
		</li>
	);
}

function toastMarks(record: ToastRecord, spot: ToastSpot): ToastMarks {
	return {
		role: record.type === "error" ? "alert" : "status",
		"data-slot": "toast",
		"data-type": record.type,
		"data-state": record.isLeaving ? "closed" : "open",
		"data-front": spot.index === 0,
		"data-visible": spot.isVisible,
	};
}

function spotStyle(spot: ToastSpot): TokenStyle {
	return { "--wg-kit-toast-index": spot.index, "--wg-kit-toast-offset": `${spot.offsetPx}px` };
}
