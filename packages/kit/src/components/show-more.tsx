import type { LooseProps } from "../types";
import { createElement as h } from "react";
import { Button } from "./button";

const SHOW_MORE = "Show more";

const SHOW_COUNT_MORE = "Show {count} more";

const LOADING_MORE = "Loading…";

export function ShowMore({ remaining, isLoading = false, onMore, children, className: cls }: LooseProps) {
	if (remaining !== undefined && !(remaining > 0)) return null;
	const said = remaining === undefined ? SHOW_MORE : SHOW_COUNT_MORE.replace("{count}", String(remaining));
	return (
		<Button size="s" block={true} className={cls} disabled={isLoading} onClick={onMore}>
			{isLoading ? LOADING_MORE : (children ?? said)}
		</Button>
	);
}
