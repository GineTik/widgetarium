import type { CSSProperties } from "react";

export type TokenStyle = CSSProperties & { readonly [token: `--${string}`]: string | number | undefined };

export type StyleProp = CSSProperties | TokenStyle;
