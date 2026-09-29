import { createContext } from "react";
import type { RenderMarkdown } from "./types";

export const Renderer = createContext<RenderMarkdown | null>(null);
