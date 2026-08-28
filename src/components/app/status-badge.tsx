import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "#/lib/utils.ts";

export type SubmissionStatus =
	| "UPLOADED"
	| "EXTRACTING"
	| "INDEXING"
	| "COMPARING"
	| "READY"
	| "FAILED";

const LABELS: Record<SubmissionStatus, string> = {
	UPLOADED: "Queued",
	EXTRACTING: "Reading document",
	INDEXING: "Fingerprinting",
	COMPARING: "Comparing",
	READY: "Report ready",
	FAILED: "Failed",
};

export const IN_PROGRESS: SubmissionStatus[] = [
	"UPLOADED",
	"EXTRACTING",
	"INDEXING",
	"COMPARING",
];

export function StatusBadge({
	status,
	className,
}: {
	status: SubmissionStatus;
	className?: string;
}) {
	const pending = IN_PROGRESS.includes(status);
	const Icon = pending
		? Loader2
		: status === "READY"
			? CheckCircle2
			: AlertCircle;

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
				status === "READY" &&
					"bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
				status === "FAILED" && "bg-destructive/10 text-destructive",
				pending && "bg-brand/10 text-brand",
				className,
			)}
		>
			<Icon className={cn("h-3.5 w-3.5", pending && "animate-spin")} />
			{LABELS[status]}
		</span>
	);
}

/** Similarity percentage, coloured by how much of the document matched. */
export function ScorePill({
	score,
	className,
}: {
	score: number | null | undefined;
	className?: string;
}) {
	if (score === null || score === undefined) {
		return (
			<span className={cn("text-sm text-muted-foreground", className)}>—</span>
		);
	}
	const percent = Math.round(score * 100);
	return (
		<span
			className={cn(
				"inline-flex min-w-[3.25rem] justify-center rounded-md px-2 py-1 text-sm font-semibold tabular-nums",
				percent >= 40
					? "bg-destructive/10 text-destructive"
					: percent >= 15
						? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
						: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
				className,
			)}
		>
			{percent}%
		</span>
	);
}
