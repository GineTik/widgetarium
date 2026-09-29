import { useState, type FormEvent, type KeyboardEvent } from "react";

export function useNameEntry(onAdd: (name: string) => void) {
	const [isOpen, setOpen] = useState(false);
	const [name, setName] = useState("");

	const confirm = () => {
		const trimmed = name.trim();
		if (trimmed) onAdd(trimmed);
		setName("");
		setOpen(false);
	};

	return {
		isOpen,
		open: () => setOpen(true),
		close: () => setOpen(false),
		confirm,
		fieldProps: {
			ref: focusWhenItAppears,
			value: name,
			onInput: (event: FormEvent<HTMLInputElement>) => setName(event.currentTarget.value),
			onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
				if (event.key === "Enter") confirm();
				if (event.key === "Escape") setOpen(false);
			},
		},
	};
}

const focusWhenItAppears = (node: HTMLInputElement | null) => node?.focus();
