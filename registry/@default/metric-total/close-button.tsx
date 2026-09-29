import { IconButton } from "widgetarium/kit";
import { Stroked } from "./stroked";

const CLOSE_CROSS = "M6.4 6.4l7.2 7.2M13.6 6.4l-7.2 7.2";

export function CloseButton({ name, onClose }: { name: string; onClose: () => void }) {
	return (
		<IconButton size="xs" label="Close" className="wg-dialog-close" data-part={`${name}-close`} onClick={onClose}>
			<Stroked part={`${name}-close-icon`} className="mt3-close-icon" size={16} weight={1.8}>
				<path d={CLOSE_CROSS} />
			</Stroked>
		</IconButton>
	);
}
