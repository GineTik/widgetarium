import { createElement as h, useRef } from "react";
import type { ChangeEvent, ReactElement } from "react";
import { Icon, IconButton } from "@widgetarium/kit";
import { Tip } from "./design-tip.js";
import { imageFilesIn } from "./design-photos.js";

const ADD_PHOTO = "Add photo";
const ADD_PHOTO_SAID = "Add a reference photo, or drop or paste one on the canvas";

export function AddPhoto({ onAddPhotos }: { readonly onAddPhotos: (photos: readonly File[]) => void }): ReactElement {
	const picker = useRef<HTMLInputElement | null>(null);
	return h("span", { className: "wg-design-add" }, [
		h(
			Tip,
			{ key: "press", label: ADD_PHOTO_SAID },
			h(
				IconButton,
				{ size: "s", variant: "ghost", label: ADD_PHOTO, onClick: () => picker.current?.click() },
				h(Icon, { name: "image-plus", size: 16 }),
			),
		),
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
