import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import { cn } from "../utils/cn";
import { Input } from "./input";
import type { InputLook, InputProps } from "./input";

export { CodeArea } from "./code-area";
export { MarkdownEditor } from "./markdown-editor";
export { TextArea, Textarea } from "./text-area";
export { FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldSet, FieldTitle } from "./field-parts";
export { FieldError } from "./field-error";
export { FieldLegend } from "./field-legend";
export { FieldSeparator } from "./field-separator";
export type { CodeAreaProps } from "./code-area";
export type { MarkdownEditorProps } from "./markdown-editor";
export type { TextAreaProps } from "./text-area";
export type { FieldErrorProps } from "./field-error";
export type { FieldLegendProps } from "./field-legend";

export type FieldLook = InputLook;

export type FieldOrientation = "vertical" | "horizontal" | "responsive";

export interface FieldRootProps extends HTMLAttributes<HTMLDivElement> {
	readonly orientation?: FieldOrientation | undefined;
	readonly children: ReactNode;
}

export type FieldInputProps = Omit<InputProps, "children"> & { readonly children?: undefined };

export type FieldProps = FieldRootProps | FieldInputProps;

// TRADE-OFF: a Field with no children is the input it named before shadcn's form field took the name
export function Field(props: FieldRootProps): ReactElement;
export function Field(props: FieldInputProps): ReactElement;
export function Field(props: FieldProps): ReactElement {
	if (isInputShaped(props)) return <Input {...props} />;
	const { orientation = "vertical", className, children, ...rest } = props;
	return (
		<div
			role="group"
			data-slot="field"
			data-orientation={orientation}
			{...rest}
			className={cn("wg-kit-form-field", `is-${orientation}`, className)}
		>
			{children}
		</div>
	);
}

function isInputShaped(props: FieldProps): props is FieldInputProps {
	return props.children === undefined || props.children === null;
}
