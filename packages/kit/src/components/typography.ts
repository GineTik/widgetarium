import type { FunctionComponent, HTMLAttributes } from "react";
import { typesetPart } from "../utils/typeset";

type TypesetPart = FunctionComponent<HTMLAttributes<HTMLElement>>;

export const TypographyH1: TypesetPart = typesetPart("h1", "h1", "TypographyH1");

export const TypographyH2: TypesetPart = typesetPart("h2", "h2", "TypographyH2");

export const TypographyH3: TypesetPart = typesetPart("h3", "h3", "TypographyH3");

export const TypographyH4: TypesetPart = typesetPart("h4", "h4", "TypographyH4");

export const TypographyP: TypesetPart = typesetPart("p", "p", "TypographyP");

export const TypographyBlockquote: TypesetPart = typesetPart("blockquote", "blockquote", "TypographyBlockquote");

export const TypographyList: TypesetPart = typesetPart("ul", "list", "TypographyList");

export const TypographyInlineCode: TypesetPart = typesetPart("code", "code", "TypographyInlineCode");

export const TypographyLead: TypesetPart = typesetPart("p", "lead", "TypographyLead");

export const TypographyLarge: TypesetPart = typesetPart("div", "large", "TypographyLarge");

export const TypographySmall: TypesetPart = typesetPart("small", "small", "TypographySmall");

export const TypographyMuted: TypesetPart = typesetPart("p", "muted", "TypographyMuted");
