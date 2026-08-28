import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SiteFooter } from "#/components/marketing/site-footer.tsx";
import { SiteHeader } from "#/components/marketing/site-header.tsx";

export const Route = createFileRoute("/_site")({ component: SiteLayout });

function SiteLayout() {
	return (
		<div className="flex min-h-screen flex-col bg-background">
			<SiteHeader />
			<main className="flex-1">
				<Outlet />
			</main>
			<SiteFooter />
		</div>
	);
}
