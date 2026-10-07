import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { z } from "zod";
import {
	Button,
	ButtonGroup,
	ButtonGroupSeparator,
	ButtonGroupText,
	Calendar,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxValue,
	Controller,
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	Icon,
	Input,
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
	InputGroupTextarea,
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
	Kbd,
	KbdGroup,
	Label,
	NativeSelect,
	NativeSelectOptGroup,
	NativeSelectOption,
	Popover,
	PopoverContent,
	PopoverTrigger,
	RadioGroup,
	RadioGroupItem,
	REGEXP_ONLY_DIGITS,
	Slider,
	Toggle,
	useForm,
} from "../packages/kit/src/index";
import type { DateRange } from "../packages/kit/src/index";
import { Named } from "./kit-demo-frame.tsx";

export const DEMO_TODAY = new Date(2026, 9, 8);

const FRAMEWORKS = ["Next.js", "SvelteKit", "Nuxt.js", "Remix", "Astro"];

const BUG_SCHEMA = z.object({
	title: z
		.string()
		.min(5, "Bug title must be at least 5 characters.")
		.max(32, "Bug title must be at most 32 characters."),
	description: z
		.string()
		.min(20, "Description must be at least 20 characters.")
		.max(100, "Description must be at most 100 characters."),
});

export function InputsCalendar(): ReactElement {
	const [day, setDay] = useState<Date | undefined>(new Date(2026, 9, 14));
	return (
		<Calendar
			mode="single"
			captionLayout="dropdown"
			selected={day}
			onSelect={setDay}
			today={DEMO_TODAY}
			startMonth={new Date(2000, 0, 1)}
			endMonth={new Date(2035, 11, 1)}
			disabled={{ dayOfWeek: [0] }}
		/>
	);
}

export function InputsDatePickers(): ReactElement {
	const [date, setDate] = useState<Date | undefined>(undefined);
	const [isOpen, setOpen] = useState(false);
	const [range, setRange] = useState<DateRange | undefined>({
		from: new Date(2026, 9, 12),
		to: new Date(2026, 9, 21),
	});
	return (
		<div className="demo-stack">
			<Named name="Popover + Calendar mode=single captionLayout=dropdown">
				<Popover open={isOpen} onOpenChange={setOpen} placement="below">
					<PopoverTrigger asChild>
						<Button variant="outline">
							{date ? date.toLocaleDateString("en-GB") : "Select date"}
							<Icon name="chevron-down" size={16} />
						</Button>
					</PopoverTrigger>
					<PopoverContent>
						<Calendar
							mode="single"
							captionLayout="dropdown"
							selected={date}
							today={DEMO_TODAY}
							onSelect={(picked) => {
								setDate(picked);
								setOpen(false);
							}}
						/>
					</PopoverContent>
				</Popover>
			</Named>
			<Named name="Calendar mode=range numberOfMonths=2">
				<Calendar
					mode="range"
					numberOfMonths={2}
					defaultMonth={range?.from}
					selected={range}
					onSelect={setRange}
					today={DEMO_TODAY}
				/>
			</Named>
		</div>
	);
}

export function InputsFields(): ReactElement {
	const [code, setCode] = useState("1234");
	return (
		<div className="demo-stack">
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

export function InputsChoices(): ReactElement {
	return (
		<div className="demo-stack">
			<Named name="RadioGroup · RadioGroupItem · Label">
				<RadioGroup defaultValue="comfortable">
					{["default", "comfortable", "compact"].map((density) => (
						<div key={density} className="demo-row">
							<RadioGroupItem value={density} id={`density-${density}`} />
							<Label htmlFor={`density-${density}`}>{density}</Label>
						</div>
					))}
				</RadioGroup>
			</Named>
			<Named name="Slider defaultValue=[50] · [20, 80]">
				<Slider defaultValue={[50]} max={100} step={1} />
				<Slider defaultValue={[20, 80]} max={100} step={5} />
			</Named>
			<Named name="Toggle · ButtonGroup · Kbd">
				<div className="demo-row">
					<Toggle aria-label="Bold" defaultPressed>
						<Icon name="bold" size={16} />
					</Toggle>
					<Toggle variant="outline" aria-label="Italic">
						<Icon name="italic" size={16} />
					</Toggle>
					<ButtonGroup>
						<Button variant="outline">Archive</Button>
						<Button variant="outline">Report</Button>
						<ButtonGroupSeparator />
						<Button variant="outline" size="icon" aria-label="More">
							<Icon name="ellipsis" size={16} />
						</Button>
					</ButtonGroup>
				</div>
				<div className="demo-row">
					<ButtonGroup>
						<ButtonGroupText>https://</ButtonGroupText>
						<Input placeholder="my-site" />
					</ButtonGroup>
					<KbdGroup>
						<Kbd>⌘</Kbd>
						<Kbd>K</Kbd>
					</KbdGroup>
				</div>
			</Named>
		</div>
	);
}

export function InputsCombobox(): ReactElement {
	const [picked, setPicked] = useState<string[]>(["Astro"]);
	return (
		<div className="demo-stack">
			<Named name="Combobox items · ComboboxInput · ComboboxList">
				<Combobox items={FRAMEWORKS}>
					<ComboboxInput placeholder="Select a framework" />
					<ComboboxContent>
						<ComboboxEmpty>No items found.</ComboboxEmpty>
						<ComboboxList>
							{(item) => (
								<ComboboxItem key={item} value={item}>
									{item}
								</ComboboxItem>
							)}
						</ComboboxList>
					</ComboboxContent>
				</Combobox>
			</Named>
			<Named name="Combobox multiple · ComboboxChips">
				<Combobox items={FRAMEWORKS} multiple value={picked} onValueChange={setPicked}>
					<ComboboxChips>
						<ComboboxValue>
							{(values) => values.map((value) => <ComboboxChip key={value}>{value}</ComboboxChip>)}
						</ComboboxValue>
						<ComboboxChipsInput placeholder="Add framework" />
					</ComboboxChips>
					<ComboboxContent>
						<ComboboxEmpty>No items found.</ComboboxEmpty>
						<ComboboxList>
							{(item) => (
								<ComboboxItem key={item} value={item}>
									{item}
								</ComboboxItem>
							)}
						</ComboboxList>
					</ComboboxContent>
				</Combobox>
			</Named>
		</div>
	);
}

export function InputsBugReport(): ReactElement {
	const form = useForm({ schema: BUG_SCHEMA, defaultValues: { title: "", description: "" } });
	const [sent, setSent] = useState("");
	return (
		<Card>
			<CardHeader>
				<CardTitle>Bug Report</CardTitle>
				<CardDescription>Help us improve by reporting bugs you encounter.</CardDescription>
			</CardHeader>
			<CardContent>
				<form id="form-bug-report" onSubmit={form.handleSubmit((data) => setSent(JSON.stringify(data)))}>
					<FieldGroup>
						<Controller
							name="title"
							control={form.control}
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel htmlFor="form-bug-title">Bug Title</FieldLabel>
									<Input
										{...field}
										id="form-bug-title"
										aria-invalid={fieldState.invalid}
										placeholder="Login button not working on mobile"
										autoComplete="off"
									/>
									{fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
								</Field>
							)}
						/>
						<Controller
							name="description"
							control={form.control}
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel htmlFor="form-bug-description">Description</FieldLabel>
									<InputGroup>
										<InputGroupTextarea
											{...field}
											id="form-bug-description"
											rows={6}
											aria-invalid={fieldState.invalid}
											placeholder="I'm having an issue with the login button on mobile."
										/>
										<InputGroupAddon align="block-end">
											<InputGroupText>{`${field.value.length}/100 characters`}</InputGroupText>
										</InputGroupAddon>
									</InputGroup>
									<FieldDescription>
										Include steps to reproduce, expected behavior, and what actually happened.
									</FieldDescription>
									{fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
								</Field>
							)}
						/>
					</FieldGroup>
				</form>
				{sent ? <p className="demo-note">{`Sent: ${sent}`}</p> : null}
			</CardContent>
			<CardFooter>
				<Button type="button" variant="outline" onClick={() => form.reset()}>
					Reset
				</Button>
				<Button type="submit" variant="default" form="form-bug-report">
					Submit
				</Button>
			</CardFooter>
		</Card>
	);
}
