import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Shape } from "../shapes/shape";
import type { PhotoCardProps } from "./photo-card";

export function Picture({ photo, seed, title, tones }: PhotoCardProps): ReactElement {
	if (photo) return <img src={photo} alt="" />;
	return (
		<span className="wg-kit-photo-card-art">
			<Shape seed={seed ?? title} tones={tones} size={96} />
		</span>
	);
}
