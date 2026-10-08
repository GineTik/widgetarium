import type { FunctionComponent, HTMLAttributes } from "react";
import { createTypesetPart } from "../utils/typeset";

type TypesetPart = FunctionComponent<HTMLAttributes<HTMLElement>>;

export const TypographyH1: TypesetPart = createTypesetPart("h1", "h1", "TypographyH1");

export const TypographyH2: TypesetPart = createTypesetPart("h2", "h2", "TypographyH2");

export const TypographyH3: TypesetPart = createTypesetPart("h3", "h3", "TypographyH3");

export const TypographyH4: TypesetPart = createTypesetPart("h4", "h4", "TypographyH4");

export const TypographyP: TypesetPart = createTypesetPart("p", "p", "TypographyP");

export const TypographyBlockquote: TypesetPart = createTypesetPart("blockquote", "blockquote", "TypographyBlockquote");

export const TypographyList: TypesetPart = createTypesetPart("ul", "list", "TypographyList");

export const TypographyInlineCode: TypesetPart = createTypesetPart("code", "code", "TypographyInlineCode");

export const TypographyLead: TypesetPart = createTypesetPart("p", "lead", "TypographyLead");

export const TypographyLarge: TypesetPart = createTypesetPart("div", "large", "TypographyLarge");

export const TypographySmall: TypesetPart = createTypesetPart("small", "small", "TypographySmall");

export const TypographyMuted: TypesetPart = createTypesetPart("p", "muted", "TypographyMuted");
