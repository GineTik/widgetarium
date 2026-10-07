import { createContext } from "react";
import type { Context } from "react";
import type { BubbleVariant } from "../constants/chat";

export const BubbleVariantContext: Context<BubbleVariant> = createContext<BubbleVariant>("default");
