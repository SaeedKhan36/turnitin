import { Link, type LinkProps } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "#/components/ui/button.tsx";
import { cn } from "#/lib/utils.ts";

/**
 * Content-driven links carry plain strings. The content module is the source of
 * truth for which paths exist, so widening to LinkProps["to"] here keeps the
 * page components readable without weakening links written by hand.
 */
export function ContentLink({
	to,
	className,
	children,
}: {
	to: string;
	className?: string;
	children: ReactNode;
}) {
	return (
		<Link to={to as LinkProps["to"]} className={className}>
			{children}
		</Link>
	);
}

export function Section({
	className,
	children,
}: {
	className?: string;
	children: ReactNode;
}) {
	return (
		<section className={cn("px-4 py-16 sm:px-6 sm:py-20", className)}>
			<div className="mx-auto max-w-6xl">{children}</div>
		</section>
	);
}

export function Eyebrow({ children }: { children: ReactNode }) {
	return (
		<p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand">
			{children}
		</p>
	);
}

export function PageHero({
	eyebrow,
	title,
	body,
	primary,
	secondary,
}: {
	eyebrow?: string;
	title: string;
	body: string;
	primary?: { label: string; to: string };
	secondary?: { label: string; to: string };
}) {
	return (
		<div className="relative overflow-hidden border-b border-brand-line bg-brand-soft/50">
			{/* Decorative wash; purely visual, hidden from assistive tech. */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full bg-brand/10 blur-3xl"
			/>
			<div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
				{eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
				<h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.1] tracking-tight text-brand-ink sm:text-6xl">
					{title}
				</h1>
				<p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
					{body}
				</p>
				{primary || secondary ? (
					<div className="mt-8 flex flex-wrap gap-3">
						{primary ? (
							<Button asChild size="lg">
								<ContentLink to={primary.to}>{primary.label}</ContentLink>
							</Button>
						) : null}
						{secondary ? (
							<Button asChild size="lg" variant="outline">
								<ContentLink to={secondary.to}>{secondary.label}</ContentLink>
							</Button>
						) : null}
					</div>
				) : null}
			</div>
		</div>
	);
}

export function CardLink({
	eyebrow,
	title,
	body,
	to,
	cta,
}: {
	eyebrow?: string;
	title: string;
	body: string;
	to: string;
	cta?: string;
}) {
	return (
		<ContentLink
			to={to}
			className="group flex flex-col rounded-2xl border border-brand-line bg-card p-6 transition hover:border-brand hover:shadow-lg"
		>
			{eyebrow ? (
				<span className="text-xs font-semibold uppercase tracking-wider text-brand">
					{eyebrow}
				</span>
			) : null}
			<h3 className="mt-2 font-display text-xl font-bold text-brand-ink">
				{title}
			</h3>
			<p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
				{body}
			</p>
			{cta ? (
				<span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
					{cta}
					<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
				</span>
			) : null}
		</ContentLink>
	);
}

export function ClosingCta({
	title,
	body,
	cta,
}: {
	title: string;
	body: string;
	cta: { label: string; to: string };
}) {
	return (
		<Section className="border-t border-brand-line">
			<div className="rounded-3xl bg-brand-ink px-8 py-14 text-center sm:px-16">
				<h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
					{title}
				</h2>
				<p className="mx-auto mt-4 max-w-xl text-white/70">{body}</p>
				<Button asChild size="lg" variant="secondary" className="mt-8">
					<ContentLink to={cta.to}>{cta.label}</ContentLink>
				</Button>
			</div>
		</Section>
	);
}
