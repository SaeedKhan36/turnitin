import { createFileRoute, notFound } from "@tanstack/react-router";
import { Check } from "lucide-react";
import {
	CardLink,
	ClosingCta,
	Eyebrow,
	PageHero,
	Section,
} from "#/components/marketing/sections.tsx";
import { PRODUCTS, SOLUTIONS } from "#/lib/site-content.ts";

export const Route = createFileRoute("/_site/solutions/$slug")({
	loader: ({ params }) => {
		const solution = SOLUTIONS.find((s) => s.slug === params.slug);
		if (!solution) throw notFound();
		return { solution };
	},
	head: ({ loaderData }) =>
		loaderData
			? {
					meta: [
						{ title: `${loaderData.solution.name} — Attest` },
						{ name: "description", content: loaderData.solution.summary },
					],
				}
			: {},
	component: SolutionPage,
});

function SolutionPage() {
	const { solution } = Route.useLoaderData();
	const related = PRODUCTS.filter((p) =>
		(solution.products as readonly string[]).includes(p.slug),
	);

	return (
		<>
			<PageHero
				eyebrow="Solution"
				title={solution.name}
				body={solution.summary}
				primary={{ label: "Open the checker", to: "/app" }}
				secondary={{ label: "Talk to us", to: "/contact" }}
			/>

			<Section>
				<div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
					<div>
						<p className="text-lg leading-relaxed text-foreground/90">
							{solution.lede}
						</p>
						<ul className="mt-8 space-y-3">
							{solution.points.map((point) => (
								<li key={point} className="flex gap-3">
									<Check className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
									<span className="text-foreground/90">{point}</span>
								</li>
							))}
						</ul>
					</div>
					<aside className="h-fit rounded-2xl border border-brand-line bg-brand-soft/40 p-6">
						<h2 className="text-sm font-semibold uppercase tracking-wide text-brand">
							Who it is for
						</h2>
						<p className="mt-2 text-sm text-foreground/90">
							{solution.forWhom}
						</p>
					</aside>
				</div>
			</Section>

			<Section className="border-t border-brand-line bg-brand-soft/30">
				<Eyebrow>Products involved</Eyebrow>
				<div className="mt-8 grid gap-5 md:grid-cols-2">
					{related.map((product) => (
						<CardLink
							key={product.slug}
							title={product.name}
							body={product.summary}
							to={`/products/${product.slug}`}
							cta="Read more"
						/>
					))}
				</div>
			</Section>

			<ClosingCta
				title="Start with one course."
				body="Create a class, set one assignment, and look at the reports before rolling anything out more widely."
				cta={{ label: "Open the checker", to: "/app" }}
			/>
		</>
	);
}
