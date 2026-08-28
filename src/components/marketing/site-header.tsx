import { Link } from "@tanstack/react-router";
import { ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "#/components/ui/button.tsx";
import { NAV } from "#/lib/site-content.ts";
import { cn } from "#/lib/utils.ts";
import { Logo } from "./logo.tsx";

export function SiteHeader() {
	const [openGroup, setOpenGroup] = useState<string | null>(null);
	const [mobileOpen, setMobileOpen] = useState(false);
	const navRef = useRef<HTMLDivElement>(null);

	// Close the mega-menu on outside click or Escape, the two things people
	// reliably try when a dropdown is in the way.
	useEffect(() => {
		function onPointerDown(event: MouseEvent) {
			if (!navRef.current?.contains(event.target as Node)) setOpenGroup(null);
		}
		function onKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setOpenGroup(null);
				setMobileOpen(false);
			}
		}
		document.addEventListener("mousedown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("mousedown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, []);

	return (
		<header className="sticky top-0 z-50 border-b border-brand-line/70 bg-background/85 backdrop-blur">
			<div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
				<Link to="/" className="shrink-0" onClick={() => setOpenGroup(null)}>
					<Logo />
				</Link>

				<div ref={navRef} className="hidden flex-1 items-center gap-1 lg:flex">
					{NAV.map((group) =>
						group.items ? (
							<div key={group.label} className="relative">
								<button
									type="button"
									aria-expanded={openGroup === group.label}
									onClick={() =>
										setOpenGroup(openGroup === group.label ? null : group.label)
									}
									className={cn(
										"flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition hover:bg-brand-soft hover:text-brand-ink",
										openGroup === group.label && "bg-brand-soft text-brand-ink",
									)}
								>
									{group.label}
									<ChevronDown
										className={cn(
											"h-4 w-4 transition-transform",
											openGroup === group.label && "rotate-180",
										)}
									/>
								</button>
								{openGroup === group.label ? (
									<div className="absolute left-0 top-full mt-2 w-[30rem] rounded-xl border border-brand-line bg-card p-2 shadow-xl">
										{group.items.map((item) => (
											<Link
												key={item.to}
												to={item.to}
												onClick={() => setOpenGroup(null)}
												className="block rounded-lg px-3 py-2.5 transition hover:bg-brand-soft"
											>
												<span className="block text-sm font-semibold text-brand-ink">
													{item.label}
												</span>
												{item.description ? (
													<span className="mt-0.5 block text-sm text-muted-foreground">
														{item.description}
													</span>
												) : null}
											</Link>
										))}
									</div>
								) : null}
							</div>
						) : (
							<Link
								key={group.label}
								to={group.to as string}
								className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition hover:bg-brand-soft hover:text-brand-ink"
							>
								{group.label}
							</Link>
						),
					)}
				</div>

				<div className="ml-auto hidden items-center gap-2 lg:flex">
					<Button asChild variant="ghost" size="sm">
						<Link to="/login">Log in</Link>
					</Button>
					<Button asChild size="sm">
						<Link to="/contact">Contact sales</Link>
					</Button>
				</div>

				<button
					type="button"
					className="ml-auto rounded-md p-2 lg:hidden"
					aria-label={mobileOpen ? "Close menu" : "Open menu"}
					aria-expanded={mobileOpen}
					onClick={() => setMobileOpen((open) => !open)}
				>
					{mobileOpen ? (
						<X className="h-5 w-5" />
					) : (
						<Menu className="h-5 w-5" />
					)}
				</button>
			</div>

			{mobileOpen ? (
				<div className="border-t border-brand-line bg-card px-4 py-4 lg:hidden">
					<nav className="flex flex-col gap-1">
						{NAV.flatMap((group) =>
							group.items
								? [
										<p
											key={group.label}
											className="px-2 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
										>
											{group.label}
										</p>,
										...group.items.map((item) => (
											<Link
												key={item.to}
												to={item.to}
												onClick={() => setMobileOpen(false)}
												className="rounded-md px-2 py-2 text-sm font-medium hover:bg-brand-soft"
											>
												{item.label}
											</Link>
										)),
									]
								: [
										<Link
											key={group.label}
											to={group.to as string}
											onClick={() => setMobileOpen(false)}
											className="rounded-md px-2 py-2 text-sm font-medium hover:bg-brand-soft"
										>
											{group.label}
										</Link>,
									],
						)}
					</nav>
					<div className="mt-4 flex gap-2">
						<Button asChild variant="outline" className="flex-1">
							<Link to="/login">Log in</Link>
						</Button>
						<Button asChild className="flex-1">
							<Link to="/contact">Contact sales</Link>
						</Button>
					</div>
				</div>
			) : null}
		</header>
	);
}
