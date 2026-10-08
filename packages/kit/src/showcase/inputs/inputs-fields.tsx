import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import {
	Icon,
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
	NativeSelect,
	NativeSelectOptGroup,
	NativeSelectOption,
	REGEXP_ONLY_DIGITS,
} from "../../index";
import { Named } from "../frame/named";

export function InputsFields(): ReactElement {
	const [code, setCode] = useState("1234");
	return (
		<div className="wg-showcase-stack">
			<Named name="InputGroup · InputGroupAddon · InputGroupButton">
				<InputGroup>
					<InputGroupInput placeholder="Search…" />
					<InputGroupAddon>
						<Icon name="search" size={16} />
					</InputGroupAddon>
					<InputGroupAddon align="inline-end">
						<InputGroupText>12 results</InputGroupText>
					</InputGroupAddon>
				</InputGroup>
				<InputGroup>
					<InputGroupAddon>
						<InputGroupText>https://</InputGroupText>
					</InputGroupAddon>
					<InputGroupInput placeholder="example.com" />
					<InputGroupAddon align="inline-end">
						<InputGroupButton size="icon-xs" aria-label="Copy">
							<Icon name="copy" size={16} />
						</InputGroupButton>
					</InputGroupAddon>
				</InputGroup>
			</Named>
			<Named name="InputOTP maxLength=6 pattern=REGEXP_ONLY_DIGITS">
				<InputOTP maxLength={6} pattern={REGEXP_ONLY_DIGITS} value={code} onChange={setCode}>
					<InputOTPGroup>
						<InputOTPSlot index={0} />
						<InputOTPSlot index={1} />
						<InputOTPSlot index={2} />
					</InputOTPGroup>
					<InputOTPSeparator />
					<InputOTPGroup>
						<InputOTPSlot index={3} />
						<InputOTPSlot index={4} />
						<InputOTPSlot index={5} />
					</InputOTPGroup>
				</InputOTP>
			</Named>
			<Named name="NativeSelect · NativeSelectOptGroup">
				<NativeSelect defaultValue="todo">
					<NativeSelectOptGroup label="Open">
						<NativeSelectOption value="todo">Todo</NativeSelectOption>
						<NativeSelectOption value="doing">In progress</NativeSelectOption>
					</NativeSelectOptGroup>
					<NativeSelectOption value="done">Done</NativeSelectOption>
				</NativeSelect>
			</Named>
		</div>
	);
}
