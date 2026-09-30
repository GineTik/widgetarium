import type { JSX as ReactJsx } from "react";

declare global {
	namespace JSX {
		type Element = ReactJsx.Element;
		type ElementType = ReactJsx.ElementType;
		type ElementClass = ReactJsx.ElementClass;
		type ElementAttributesProperty = ReactJsx.ElementAttributesProperty;
		type ElementChildrenAttribute = ReactJsx.ElementChildrenAttribute;
		type LibraryManagedAttributes<C, P> = ReactJsx.LibraryManagedAttributes<C, P>;
		type IntrinsicAttributes = ReactJsx.IntrinsicAttributes;
		type IntrinsicClassAttributes<T> = ReactJsx.IntrinsicClassAttributes<T>;
		type IntrinsicElements = ReactJsx.IntrinsicElements;
	}
}
