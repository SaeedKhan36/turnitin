import { Link } from "@tanstack/react-router";
import { BRAND, FOOTER_GROUPS } from "#/lib/site-content.ts";
import { Logo } from "./logo.tsx";

export function SiteFooter() {
	return (
		<footer className="border-t border-brand-line bg-brand-soft/40">
			<div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
				<div className="grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
					<div>
						<Logo />
						<p className="mt-3 max-w-xs text-sm text-muted-foreground">
							{BRAND.description}
						</p>
					</div>
					{FOOTER_GROUPS.map((group) => (
						<div key={group.title}>
							<h2 className="text-sm font-semibold text-brand-ink">
								{group.title}
							</h2>
							<ul className="mt-3 space-y-2">
								{group.links.map((link) => (
									<li key={`${group.title}-${link.to}`}>
										<Link
											to={link.to}
											className="text-sm text-muted-foreground transition hover:text-brand-ink"
										>
											{link.label}
										</Link>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>

				<div className="mt-12 border-t border-brand-line pt-6 text-sm text-muted-foreground">
					<p>
						{BRAND.name} is a demonstration build — an original
						academic-integrity product, not affiliated with or endorsed by any
						existing vendor.
					</p>
					<p className="mt-2">
						© {new Date().getFullYear()} {BRAND.name}. Matching runs against
						documents submitted to this instance only; there is no web crawl or
						publisher database behind it.
					</p>
				</div>
			</div>
		</footer>
	);
}
