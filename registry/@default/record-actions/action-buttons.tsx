import { Icon, IconButton, Popover, PopoverContent, PopoverItem, PopoverTrigger } from "widgetarium/kit";
import { DELETE, EDIT } from "./labels";

type ActionButtonsProps = {
	noun: string;
	canEdit: boolean;
	canDelete: boolean;
	onAsk: (asked: "edit" | "delete") => void;
};

export function ActionButtons({ noun, canEdit, canDelete, onAsk }: ActionButtonsProps) {
	return (
		<>
			{canEdit ? (
				<IconButton label={EDIT.replace("{noun}", noun)} onClick={() => onAsk("edit")}>
					<Icon name="pencil" />
				</IconButton>
			) : null}
			{canDelete ? (
				<Popover>
					<PopoverTrigger asChild>
						<IconButton label="More" variant="ghost">
							<Icon name="ellipsis" />
						</IconButton>
					</PopoverTrigger>
					<PopoverContent>
						<PopoverItem onClick={() => onAsk("delete")}>{DELETE.replace("{noun}", noun)}</PopoverItem>
					</PopoverContent>
				</Popover>
			) : null}
		</>
	);
}
