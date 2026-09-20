declare namespace JSX {
	interface IntrinsicElements {
		[name: string]: any;
	}
	interface IntrinsicAttributes {
		key?: unknown;
		ref?: unknown;
	}
	interface ElementChildrenAttribute {
		children: unknown;
	}
}

declare module "react/jsx-runtime" {
	export const jsx: any;
	export const jsxs: any;
	export const Fragment: any;
}

declare module "react" {
	export type ReactNode = any;
	export type ReactElement = any;
	export type CSSProperties = Record<string, any>;
	export type Ref<T> = { current: T | null } | ((held: T | null) => void) | null;
	export type RefObject<T> = { current: T | null };
	export type MutableRefObject<T> = { current: T };
	export type ComponentType<P = any> = (props: P) => any;
	export type FC<P = any> = (props: P) => any;
	export type PropsWithChildren<P = unknown> = P & { children?: any };
	export type SyntheticEvent<T = any> = any;
	export type FormEvent<T = any> = any;
	export type ChangeEvent<T = any> = any;
	export type KeyboardEvent<T = any> = any;
	export type MouseEvent<T = any> = any;
	export type PointerEvent<T = any> = any;
	export type DragEvent<T = any> = any;
	export type WheelEvent<T = any> = any;
	export type FocusEvent<T = any> = any;
	export type TouchEvent<T = any> = any;
	export type ClipboardEvent<T = any> = any;
	export type UIEvent<T = any> = any;
	export type HTMLAttributes<T = any> = any;
	export type Dispatch<T> = (next: T) => void;
	export type SetStateAction<T> = T | ((held: T) => T);

	export function useState<T>(initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>];
	export function useState<T = undefined>(): [T | undefined, Dispatch<SetStateAction<T | undefined>>];
	export function useEffect(run: () => void | (() => void), watches?: readonly any[]): void;
	export function useLayoutEffect(run: () => void | (() => void), watches?: readonly any[]): void;
	export function useMemo<T>(made: () => T, watches: readonly any[]): T;
	export function useCallback<T extends (...given: any[]) => any>(held: T, watches: readonly any[]): T;
	export function useRef<T>(initial: T): MutableRefObject<T>;
	export function useRef<T>(initial: T | null): RefObject<T>;
	export function useRef<T = undefined>(): MutableRefObject<T | undefined>;
	export function useReducer(...given: any[]): any;
	export function useContext<T>(held: any): T;
	export function createContext<T>(initial: T): any;
	export function useSyncExternalStore<T>(
		subscribe: (listener: () => void) => () => void,
		read: () => T,
		readOnServer?: () => T,
	): T;
	export function useId(): string;
	export function useTransition(): [boolean, (run: () => void) => void];
	export function useDeferredValue<T>(held: T): T;
	export function useImperativeHandle(...given: any[]): void;
	export function memo<T>(held: T, same?: (before: any, after: any) => boolean): T;
	export function forwardRef<T = any, P = any>(render: (props: P, ref: Ref<T>) => any): (props: P) => any;
	export function createElement(...parts: any[]): any;
	export function cloneElement(...parts: any[]): any;
	export const Fragment: any;
	export const StrictMode: any;
	const React: any;
	export default React;
}
