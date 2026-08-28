import { cn } from "#/lib/utils.ts";

/** Original wordmark: a document sheet with a check, plus the brand name. */
export function Logo({
	className,
	showName = true,
}: {
	className?: string;
	showName?: boolean;
}) {
	return (
		<span className={cn("inline-flex items-center gap-2", className)}>
			<svg
				viewBox="0 0 32 32"
				className="h-7 w-7 shrink-0"
				aria-hidden="true"
				fill="none"
			>
				<title>Attest</title>
				<rect
					x="5"
					y="2.5"
					width="18"
					height="24"
					rx="3"
					className="fill-brand-soft stroke-brand"
					strokeWidth="1.8"
				/>
				<path
					d="M10 10h8M10 14.5h8M10 19h4"
					className="stroke-brand"
					strokeWidth="1.6"
					strokeLinecap="round"
				/>
				<circle cx="22.5" cy="22" r="7" className="fill-brand" />
				<path
					d="m19.4 22.1 2.2 2.3 4.1-4.5"
					stroke="white"
					strokeWidth="2.1"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
			{showName ? (
				<span className="font-display text-xl font-bold tracking-tight text-brand-ink">
					Attest
				</span>
			) : null}
		</span>
	);
}
