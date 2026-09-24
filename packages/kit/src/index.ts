import { ActionButton, Button, ButtonLabel, IconButton, ShowMore, Spinner } from "./components/button";
import { Badge, Count, Pill } from "./components/badge";

import { Calendar } from "./components/calendar";
import { Card, Plate, Surface } from "./components/card";

import { Emblem, EmblemDiceBear, EmblemFallback, EmblemImage, PlaceholderMark } from "./components/emblem";
import { Field, MarkdownEditor, TextArea } from "./components/field";
import { CodeBlock } from "./components/code-block";
import { Grid, Layout, LayoutActions, LayoutHeader, LayoutItem, LayoutTitle, Rows } from "./components/layout";
import { Heading } from "./components/heading";

import { List, Row, RowBadge, RowLabel, RowValue, SlotList } from "./components/list";

import {
	Popover,
	PopoverContent,
	PopoverItem,
	PopoverSearch,
	PopoverSeparator,
	PopoverTrigger,
} from "./components/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/select";

import { Progress, ProgressBar, StatusProgress } from "./components/progress";

import { Segmented, Tabs } from "./components/segmented";

import { Sidebar, SidebarGroup, SidebarRow, SidebarSheet } from "./components/sidebar";

import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "./components/pagination";

import { Skeleton } from "./components/skeleton";

import { DataTable } from "./components/data-table";

import { Sparkline, SparklineArea, SparklineBars, SparklineDot, SparklineLine } from "./components/sparkline";

import { Switch } from "./components/switch";

import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from "./components/table";

import { LAYOUT_KINDS } from "./constants/layout";
import { MARK_SHAPE_NAMES, MARK_TONE_NAMES } from "./constants/marks";
import { APPROVAL_TONES, BADGE_COLORS, BADGE_VARIANTS, PRIORITY_TONES, TONE_NAMES } from "./constants/tones";
import { useRoomForLabel } from "./hooks/use-room-for-label";
import { useSegmentedThumb } from "./hooks/use-segmented-thumb";
import { Icon } from "./icons/icon";
import {
	buttonClass,
	cardClass,
	fieldClass,
	glassClass,
	iconButtonClass,
	listClass,
	pillClass,
	plateClass,
	rowClass,
	sidebarClass,
} from "./utils/class-names";
import { cn, variants } from "./utils/cn";
import { markOf } from "./utils/marks";
import { progressState } from "./utils/progress";
import { barGeometry, circleGeometry } from "./utils/progress-geometry";
import { inkedClass, toneClass, toneOf } from "./utils/tones";

export const Kit = {
	Sidebar,
	sidebarClass,
	SidebarSheet,
	SidebarGroup,
	SidebarRow,
	cn,
	cx: cn,
	variants,
	Button,
	ButtonLabel,
	IconButton,
	Badge,
	Spinner,
	Emblem,
	EmblemImage,
	EmblemDiceBear,
	EmblemFallback,
	ActionButton,
	Tabs,
	BADGE_VARIANTS,
	BADGE_COLORS,
	Heading,
	Pill,
	ShowMore,
	Count,
	Plate,
	Card,
	Surface,
	Layout,
	LayoutHeader,
	LayoutTitle,
	LayoutActions,
	LayoutItem,
	Rows,
	Grid,
	LAYOUT_KINDS,
	SlotList,
	List,
	Row,
	RowBadge,
	RowLabel,
	RowValue,
	Field,
	TextArea,
	fieldClass,
	Icon,
	PlaceholderMark,
	markOf,
	MARK_SHAPE_NAMES,
	MARK_TONE_NAMES,
	PRIORITY_TONES,
	APPROVAL_TONES,
	TONE_NAMES,
	toneOf,
	toneClass,
	Segmented,
	useSegmentedThumb,
	useRoomForLabel,
	Popover,
	PopoverTrigger,
	PopoverContent,
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
	PopoverItem,
	PopoverSearch,
	PopoverSeparator,
	Calendar,
	Progress,
	ProgressBar,
	StatusProgress,
	inkedClass,
	barGeometry,
	circleGeometry,
	progressState,
	MarkdownEditor,
	CodeBlock,
	Sparkline,
	SparklineArea,
	SparklineBars,
	SparklineDot,
	SparklineLine,
	Skeleton,
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationPrevious,
	PaginationNext,
	PaginationEllipsis,
	Table,
	TableHeader,
	TableBody,
	TableFooter,
	TableRow,
	TableHead,
	TableCell,
	TableCaption,
	DataTable,
	Switch,
	buttonClass,
	iconButtonClass,
	pillClass,
	plateClass,
	cardClass,
	listClass,
	rowClass,
	glassClass,
};

export { ActionButton, Button, ButtonLabel, IconButton, ShowMore, Spinner } from "./components/button";
export { Badge, Count, Pill } from "./components/badge";

export { Calendar } from "./components/calendar";
export { Card, Plate, Surface } from "./components/card";
export { CodeArea, Field, MarkdownEditor, TextArea } from "./components/field";
export { CodeBlock } from "./components/code-block";

export { Emblem, EmblemDiceBear, EmblemFallback, EmblemImage, PlaceholderMark } from "./components/emblem";

export { Grid, Layout, LayoutActions, LayoutHeader, LayoutItem, LayoutTitle, Rows } from "./components/layout";
export { Heading } from "./components/heading";

export { List, Row, RowBadge, RowLabel, RowValue, SlotList } from "./components/list";

export {
	Popover,
	PopoverContent,
	PopoverItem,
	PopoverSearch,
	PopoverSeparator,
	PopoverTrigger,
	usePopover,
} from "./components/popover";

export { Progress, ProgressBar, StatusProgress } from "./components/progress";

export { Segmented, Tabs } from "./components/segmented";

export { Sidebar, SidebarGroup, SidebarRow, SidebarSheet } from "./components/sidebar";
export { Slot, Slottable, composeRefs, slotted } from "./components/slot";
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/select";

export {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "./components/pagination";
export { paginationItems } from "./utils/pagination";
export type { PaginationEntry } from "./utils/pagination";

export { Skeleton } from "./components/skeleton";

export { Sparkline, SparklineArea, SparklineBars, SparklineDot, SparklineLine } from "./components/sparkline";

export { Switch } from "./components/switch";

export { DataTable } from "./components/data-table";
export type { DataColumn, SortOrder } from "./utils/data-table";

export {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from "./components/table";

export { LAYOUT_KINDS } from "./constants/layout";
export { MARK_SHAPE_NAMES, MARK_TONE_NAMES } from "./constants/marks";
export { APPROVAL_TONES, BADGE_COLORS, BADGE_VARIANTS, PRIORITY_TONES, TONE_NAMES } from "./constants/tones";
export { useRoomForLabel } from "./hooks/use-room-for-label";
export { useSegmentedThumb } from "./hooks/use-segmented-thumb";
export { Icon } from "./icons/icon";
export { offeredIcons } from "./icons/offered-icons";
export {
	buttonClass,
	cardClass,
	fieldClass,
	glassClass,
	iconButtonClass,
	listClass,
	pillClass,
	plateClass,
	rowClass,
	sidebarClass,
} from "./utils/class-names";
export { cn, cn as cx, variants } from "./utils/cn";
export { markOf } from "./utils/marks";
export { plateEdgesTakenBy } from "./utils/plate-edges";
export { progressState } from "./utils/progress";
export { barGeometry, circleGeometry } from "./utils/progress-geometry";
export { inkedClass, toneClass, toneOf } from "./utils/tones";
