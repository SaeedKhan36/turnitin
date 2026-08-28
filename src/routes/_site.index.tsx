import { createFileRoute } from "@tanstack/react-router";
import { Quote } from "lucide-react";
import {
	CardLink,
	ClosingCta,
	Eyebrow,
	PageHero,
	Section,
} from "#/components/marketing/sections.tsx";
import { BRAND, HOME } from "#/lib/site-content.ts";

export const Route = createFileRoute("/_site/")({
	component: HomePage,
	head: () => ({
		meta: [
			{ title: `${BRAND.name} — ${BRAND.tagline}` },
			{ name: "description", content: BRAND.description },
		],
	}),
});

function HomePage() {
	return (
		<>
			<PageHero
				eyebrow={HOME.hero.eyebrow}
				title={HOME.hero.title}
				body={HOME.hero.body}
				primary={HOME.hero.primaryCta}
				secondary={HOME.hero.secondaryCta}
			/>

			<Section>
				<div className="grid gap-5 md:grid-cols-3">
					{HOME.promos.map((promo) => (
						<CardLink key={promo.title} {...promo} />
					))}
				</div>
			</Section>

			<Section className="border-y border-brand-line bg-brand-soft/30">
				<div className="grid items-center gap-8 md:grid-cols-2">
					<div>
						<h2 className="font-display text-3xl font-bold text-brand-ink">
							{HOME.trust.stat}
						</h2>
						<p className="mt-3 text-muted-foreground">{HOME.trust.body}</p>
					</div>
					<ul className="flex flex-wrap gap-2.5">
						{HOME.trust.items.map((item) => (
							<li
								key={item}
								className="rounded-full border border-brand-line bg-card px-4 py-2 text-sm font-medium text-brand-ink"
							>
								{item}
							</li>
						))}
					</ul>
				</div>
			</Section>

			<Section>
				<Eyebrow>Whatever you need to check</Eyebrow>
				<h2 className="mt-3 max-w-2xl font-display text-3xl font-bold text-brand-ink sm:text-4xl">
					Three problems, one engine underneath.
				</h2>
				<div className="mt-10 grid gap-5 md:grid-cols-3">
					{HOME.pillars.map((pillar) => (
						<CardLink key={pillar.title} {...pillar} cta="Learn more" />
					))}
				</div>
			</Section>

			<Section className="border-t border-brand-line bg-brand-soft/30">
				<Eyebrow>What people say</Eyebrow>
				<h2 className="mt-3 font-display text-3xl font-bold text-brand-ink">
					For educators. For students. For integrity.
				</h2>
				<div className="mt-10 grid gap-5 md:grid-cols-3">
					{HOME.testimonials.map((testimonial) => (
						<figure
							key={testimonial.quote}
							className="flex flex-col rounded-2xl border border-brand-line bg-card p-6"
						>
							<Quote className="h-6 w-6 text-brand/40" aria-hidden="true" />
							<blockquote className="mt-3 flex-1 text-sm leading-relaxed text-foreground/90">
								{testimonial.quote}
							</blockquote>
							<figcaption className="mt-5 border-t border-brand-line pt-4">
								<span className="block text-sm font-semibold text-brand-ink">
									{testimonial.name}
								</span>
								<span className="block text-xs text-muted-foreground">
									{testimonial.role}
								</span>
							</figcaption>
						</figure>
					))}
				</div>
			</Section>

			<ClosingCta {...HOME.closing} />
		</>
	);
}
