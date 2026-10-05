import { createElement as h, useRef } from "react";
import type { ChangeEvent, ReactElement } from "react";
import { Button, Icon } from "@widgetarium/kit";
import { imageFilesIn } from "./design-photos.js";

const ADD_PHOTO = "Add photo";
const DROP_HINT = "Drop or paste photos to add references";

export function AddPhoto({ onAddPhotos }: { readonly onAddPhotos: (photos: readonly File[]) => void }): ReactElement {
	const picker = useRef<HTMLInputElement | null>(null);
	return h("span", { className: "wg-design-add" }, [
		h(Button, { key: "press", size: "s", variant: "ghost", title: DROP_HINT, onClick: () => picker.current?.click() }, [
			h(Icon, { key: "icon", name: "image-plus" }),
			ADD_PHOTO,
		]),
		h("input", {
			key: "picker",
			ref: picker,
			type: "file",
			accept: "image/*",
			multiple: true,
			hidden: true,
			onChange: (event: ChangeEvent<HTMLInputElement>) => {
				onAddPhotos(imageFilesIn(event.currentTarget.files));
				event.currentTarget.value = "";
			},
		}),
	]);
}
