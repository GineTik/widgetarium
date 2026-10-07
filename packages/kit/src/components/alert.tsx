import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import type { ToneName } from "../constants/tones";
import { cn } from "../utils/cn";
import { Card } from "./card";

export { AlertAction, AlertDescription, AlertTitle } from "./alert-parts";

export type AlertVariant = "default" | "destructive";

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, "style"> {
	readonly variant?: AlertVariant | undefined;
	readonly tone?: ToneName | undefined;
}

export function Alert({ variant = "default", tone, className, ...rest }: AlertProps): ReactElement {
	const worn = tone ?? (variant === "destructive" ? "error" : undefined);
	return (
		<Card
			role="alert"
			{...rest}
			data-slot="alert"
			data-variant={variant}
			tone={worn}
			className={cn("wg-kit-alert", variant === "destructive" && "is-destructive", className)}
		/>
	);
}
