import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { useReportsHeight } from "../hooks/use-reports-height";
import { useToastTimer } from "../hooks/use-toast-timer";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";
import { TOAST_QUEUE } from "../utils/toast-queue";
import type { ToastId, ToastRecord } from "../utils/toast-queue";
import type { TokenStyle } from "../utils/token-style";
import { IconButton } from "./icon-button";
import { ToastIcon } from "./toast-icon";
import { ToastPress } from "./toast-press";

export interface ToastSpot {
	readonly index: number;
	readonly offsetPx: number;
	readonly isVisible: boolean;
}

export interface ToastLook {
	readonly closeButton: boolean;
	readonly durationMs: number;
}

export interface ToastItemProps {
	readonly record: ToastRecord;
	readonly spot: ToastSpot;
	readonly look: ToastLook;
	readonly isPaused: boolean;
	readonly onHeight: (id: ToastId, height: number) => void;
}

const CLOSE_LABEL = "Close";

export function ToastItem({ record, spot, look, isPaused, onHeight }: ToastItemProps): ReactElement {
	const itemRef = useRef<HTMLLIElement>(null);
	useReportsHeight(itemRef, record.id, onHeight);
	useToastTimer(record, isPaused, look.durationMs);
	return (
		<li
			ref={itemRef}
			role={record.type === "error" ? "alert" : "status"}
			data-slot="toast"
			data-type={record.type}
			data-state={record.isLeaving ? "closed" : "open"}
			data-front={spot.index === 0}
			data-visible={spot.isVisible}
			className={cn("wg-kit-toast", record.className)}
			style={spotStyle(spot)}
		>
			<ToastIcon type={record.type} icon={record.icon} />
			<div className="wg-kit-toast-text">
				<div className="wg-kit-toast-title">{record.title}</div>
				{record.description ? <div className="wg-kit-toast-description">{record.description}</div> : null}
			</div>
			{record.cancel ? <ToastPress button={record.cancel} id={record.id} variant="ghost" /> : null}
			{record.action ? <ToastPress button={record.action} id={record.id} variant="default" /> : null}
			{look.closeButton || record.closeButton ? (
				<IconButton
					variant="ghost"
					size="s"
					label={CLOSE_LABEL}
					className="wg-kit-toast-close"
					onClick={() => TOAST_QUEUE.dismiss(record.id)}
				>
					<Icon name="x" />
				</IconButton>
			) : null}
		</li>
	);
}

function spotStyle(spot: ToastSpot): TokenStyle {
	return { "--wg-kit-toast-index": spot.index, "--wg-kit-toast-offset": `${spot.offsetPx}px` };
}
