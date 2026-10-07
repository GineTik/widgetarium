export const INPUTS_USAGE = {
	calendar: `import { Calendar } from "widgetarium/kit";

<Calendar mode="single" captionLayout="dropdown" selected={date} onSelect={setDate}
	startMonth={new Date(2000, 0)} endMonth={new Date(2035, 11)} disabled={{ dayOfWeek: [0] }} />`,
	datePicker: `<Popover open={open} onOpenChange={setOpen} placement="below">
	<PopoverTrigger asChild><Button variant="outline">{date ? date.toLocaleDateString() : "Select date"}</Button></PopoverTrigger>
	<PopoverContent>
		<Calendar mode="single" captionLayout="dropdown" selected={date}
			onSelect={(day) => { setDate(day); setOpen(false); }} />
	</PopoverContent>
</Popover>
<Calendar mode="range" numberOfMonths={2} selected={range} onSelect={setRange} />`,
	fields: `<InputGroup>
	<InputGroupInput placeholder="Search…" />
	<InputGroupAddon><Icon name="search" /></InputGroupAddon>
</InputGroup>
<InputOTP maxLength={6} pattern={REGEXP_ONLY_DIGITS} value={code} onChange={setCode}>
	<InputOTPGroup><InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} /></InputOTPGroup>
	<InputOTPSeparator />
	<InputOTPGroup><InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} /></InputOTPGroup>
</InputOTP>
<NativeSelect><NativeSelectOption value="todo">Todo</NativeSelectOption></NativeSelect>`,
	choices: `<RadioGroup defaultValue="comfortable">
	<RadioGroupItem value="comfortable" id="r1" /><Label htmlFor="r1">Comfortable</Label>
</RadioGroup>
<Slider defaultValue={[20, 80]} max={100} step={5} />
<Toggle aria-label="Bold"><Icon name="bold" /></Toggle>
<ButtonGroup><Button variant="outline">Archive</Button><ButtonGroupSeparator /></ButtonGroup>
<KbdGroup><Kbd>⌘</Kbd><Kbd>K</Kbd></KbdGroup>`,
	combobox: `<Combobox items={frameworks}>
	<ComboboxInput placeholder="Select a framework" />
	<ComboboxContent>
		<ComboboxEmpty>No items found.</ComboboxEmpty>
		<ComboboxList>{(item) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>}</ComboboxList>
	</ComboboxContent>
</Combobox>`,
	form: `const form = useForm({ schema: bugSchema, defaultValues: { title: "", description: "" } });

<form id="bug" onSubmit={form.handleSubmit(send)}>
	<Controller name="title" control={form.control} render={({ field, fieldState }) => (
		<Field data-invalid={fieldState.invalid}>
			<FieldLabel htmlFor="bug-title">Bug Title</FieldLabel>
			<Input {...field} id="bug-title" aria-invalid={fieldState.invalid} />
			{fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
		</Field>
	)} />
</form>`,
};
