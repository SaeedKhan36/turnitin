import { createFileRoute, notFound } from "@tanstack/react-router";
import { Check } from "lucide-react";
import {
	CardLink,
	ClosingCta,
	Eyebrow,
	PageHero,
	Section,
} from "#/components/marketing/sections.tsx";
import { PRODUCTS } from "#/lib/site-content.ts";

export const Route = createFileRoute("/_site/products/$slug")({
	loader: ({ params }) => {
		const product = PRODUCTS.find((p) => p.slug === params.slug);
		if (!product) throw notFound();
		return { product };
	},
	head: ({ loaderData }) =>
		loaderData
			? {
					meta: [
						{ title: `${loaderData.product.name} — Attest` },
						{ name: "description", content: loaderData.product.summary },
					],
				}
			: {},
	component: ProductPage,
});

function ProductPage() {
	const { product } = Route.useLoaderData();
	const others = PRODUCTS.filter((p) => p.slug !== product.slug).slice(0, 3);

	return (
		<>
			<PageHero
				eyebrow="Product"
				title={product.name}
				body={product.summary}
				primary={{ label: "Open the checker", to: "/app" }}
				secondary={{ label: "Contact sales", to: "/contact" }}
			/>

			<Section>
				<div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
					<div>
						<p className="text-lg leading-relaxed text-foreground/90">
							{product.body}
						</p>
						<div className="mt-10 space-y-6">
							{product.features.map((feature) => (
								<div key={feature.title} className="flex gap-4">
									<span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10">
										<Check className="h-3.5 w-3.5 text-brand" />
									</span>
									<div>
										<h3 className="font-semibold text-brand-ink">
											{feature.title}
										</h3>
										<p className="mt-1 text-sm leading-relaxed text-muted-foreground">
											{feature.detail}
										</p>
									</div>
								</div>
							))}
						</div>
					</div>

					<aside className="h-fit rounded-2xl border border-brand-line bg-brand-soft/40 p-6">
						<h2 className="text-sm font-semibold uppercase tracking-wide text-brand">
							Who it is for
						</h2>
						<p className="mt-2 text-sm text-foreground/90">
							{product.audience}
						</p>
						<h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-brand">
							Scope
						</h2>
						<p className="mt-2 text-sm text-muted-foreground">
							Matching covers documents submitted to your instance plus
							reference material you add. There is no web crawl or third-party
							publisher index behind it.
						</p>
					</aside>
				</div>
			</Section>

			<Section className="border-t border-brand-line bg-brand-soft/30">
				<Eyebrow>Also in the suite</Eyebrow>
				<div className="mt-8 grid gap-5 md:grid-cols-3">
					{others.map((other) => (
						<CardLink
							key={other.slug}
							title={other.name}
							body={other.summary}
							to={`/products/${other.slug}`}
							cta="Read more"
						/>
					))}
				</div>
			</Section>

			<ClosingCta
				title="Run it on your own document."
				body="The fastest way to judge a similarity tool is to point it at something you already know the answer to."
				cta={{ label: "Open the checker", to: "/app" }}
			/>
		</>
	);
}
