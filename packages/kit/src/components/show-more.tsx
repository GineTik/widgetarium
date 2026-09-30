import { createElement as h } from "react";
import type { MouseEventHandler, ReactNode } from "react";

import { Button } from "./button";

export interface ShowMoreProps {
	readonly remaining?: number | undefined;
	readonly isLoading?: boolean;
	readonly onMore?: MouseEventHandler<HTMLButtonElement> | undefined;
	readonly children?: ReactNode;
	readonly className?: string | undefined;
}

const SHOW_MORE = "Show more";

const SHOW_COUNT_MORE = "Show {count} more";

const LOADING_MORE = "Loading…";

export function ShowMore({ remaining, isLoading = false, onMore, children, className: cls }: ShowMoreProps): ReactNode {
	if (remaining !== undefined && !(remaining > 0)) return null;
	const said = remaining === undefined ? SHOW_MORE : SHOW_COUNT_MORE.replace("{count}", String(remaining));
	return (
		<Button size="s" block={true} className={cls} disabled={isLoading} onClick={onMore}>
			{isLoading ? LOADING_MORE : (children ?? said)}
		</Button>
	);
}
