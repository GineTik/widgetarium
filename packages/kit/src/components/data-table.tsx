import { createElement as h } from "react";
import { LOADING_ROWS, NOTHING_HERE, SORT_ICONS, SPOKEN_SORT } from "../constants/data-table";
import { Icon } from "../icons/icon";
import type { LooseProps } from "../types";
import { buttonClass } from "../utils/class-names";
import { cn } from "../utils/cn";
import { alignOf, cellText, keyOfRow, nextSort } from "../utils/data-table";
import { Pagination } from "./pagination";
import { Skeleton } from "./skeleton";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "./table";

const SORT_ICON_PX = 14;

const SORT_LOOK = buttonClass({ variant: "ghost", size: "s" });

export function DataTable({
	columns = [],
	sort = null,
	onSortChange,
	caption,
	page,
	count,
	onPageChange,
	className: cls,
	...body
}: LooseProps) {
	return (
		<div className={cn("wg-kit-data-table", cls)}>
			<Table>
				{caption ? <TableCaption>{caption}</TableCaption> : null}
				<TableHeader>
					<TableRow>
						{columns.map((column) => (
							<ColumnHead key={column.key} column={column} sort={sort} onSortChange={onSortChange} />
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					<Body {...body} columns={columns} />
				</TableBody>
			</Table>
			<Pagination page={page} count={count} onPageChange={onPageChange} />
		</div>
	);
}

function ColumnHead({ column, sort, onSortChange }: LooseProps) {
	const direction = sort?.key === column.key ? sort.direction : null;
	const align = alignOf(column);
	return (
		<TableHead data-align={align} aria-sort={direction ? SPOKEN_SORT[direction] : undefined}>
			<HeadLabel column={column} sort={sort} direction={direction} align={align} onSortChange={onSortChange} />
		</TableHead>
	);
}

function HeadLabel({ column, sort, direction, align, onSortChange }: LooseProps) {
	const label = column.label ?? column.key;
	if (typeof onSortChange !== "function" || column.sortable === false) return label;
	const mark = <Icon name={SORT_ICONS[direction ?? "none"]} size={SORT_ICON_PX} />;
	return (
		<button
			type="button"
			className={cn(SORT_LOOK, "wg-kit-data-table-sort")}
			data-sorted={direction ?? undefined}
			onClick={() => onSortChange(nextSort(sort, column.key))}
		>
			{align === "end" ? mark : null}
			{label}
			{align === "end" ? null : mark}
		</button>
	);
}

function Body({ rows = [], columns, isLoading, failure, empty = NOTHING_HERE, ...rowsProps }: LooseProps) {
	if (isLoading && rows.length === 0) return <LoadingRows columns={columns} />;
	if (failure) return <LoneRow columns={columns} text={failure} isFailure />;
	if (rows.length === 0) return <LoneRow columns={columns} text={empty} />;
	return <DataRows {...rowsProps} rows={rows} columns={columns} />;
}

function DataRows({ rows, columns, rowKey = keyOfRow, selected, onSelect, rowProps }: LooseProps) {
	return rows.map((row, index) => {
		const key = rowKey(row, index);
		return (
			<DataRow
				key={key}
				row={row}
				rowKey={key}
				columns={columns}
				isSelected={selected !== undefined && selected === key}
				onSelect={onSelect}
				extra={rowProps?.(row) ?? {}}
			/>
		);
	});
}

function DataRow({ row, rowKey, columns, isSelected, onSelect, extra }: LooseProps) {
	return (
		<TableRow
			{...extra}
			{...pressableRow(onSelect, () => onSelect(rowKey, row), isSelected)}
			className={cn(typeof onSelect === "function" && "is-pressable", extra.className)}
			data-state={isSelected ? "selected" : undefined}
		>
			{columns.map((column) => (
				<TableCell key={column.key} data-align={alignOf(column)}>
					{column.render ? column.render(row) : cellText(row?.[column.key])}
				</TableCell>
			))}
		</TableRow>
	);
}

function pressableRow(onSelect, press, isSelected) {
	if (typeof onSelect !== "function") return {};
	return {
		tabIndex: 0,
		"aria-selected": String(isSelected),
		onClick: press,
		onKeyDown: (event) => pressOnKey(event, press),
	};
}

function pressOnKey(event, press) {
	if (event.key !== "Enter" && event.key !== " ") return;
	event.preventDefault();
	press();
}

function LoadingRows({ columns }: LooseProps) {
	return Array.from({ length: LOADING_ROWS }, (_, at) => (
		<TableRow key={at} aria-hidden="true">
			{columns.map((column) => (
				<TableCell key={column.key}>
					<Skeleton kind="text" lines={1} />
				</TableCell>
			))}
		</TableRow>
	));
}

function LoneRow({ columns, text, isFailure = false }: LooseProps) {
	return (
		<TableRow>
			<TableCell
				colSpan={Math.max(columns.length, 1)}
				className="wg-kit-data-table-said"
				data-failure={isFailure ? "" : undefined}
			>
				{text}
			</TableCell>
		</TableRow>
	);
}
