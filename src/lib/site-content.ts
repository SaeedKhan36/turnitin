/**
 * All marketing copy lives here so the page components stay structural.
 *
 * The information architecture mirrors a modern academic-integrity vendor site
 * (nav groups, product families, footer columns). The words are original —
 * this is a build of the *shape* of that kind of site, not a reproduction of
 * any company's text or branding.
 */

export const BRAND = {
	name: "Attest",
	tagline: "Academic integrity infrastructure",
	description:
		"Attest helps institutions check originality, run secure assessments, and teach students to use AI honestly.",
};

export interface NavLink {
	label: string;
	to: string;
	description?: string;
}

export interface NavGroup {
	label: string;
	to?: string;
	items?: NavLink[];
}

export const PRODUCTS = [
	{
		slug: "similarity",
		name: "Attest Similarity",
		summary:
			"Compare submitted work against everything your institution has collected before.",
		audience: "Course instructors and integrity officers",
		body: "Every document that enters Attest is fingerprinted and indexed. When new work arrives, matching passages are found in seconds and shown side by side with the document they came from — with the exact text highlighted, not just a percentage.",
		features: [
			{
				title: "Passage-level matching",
				detail:
					"Reports point at specific sentences, with the source excerpt beside them, so a conversation with a student starts from evidence rather than a number.",
			},
			{
				title: "Quotation and reference handling",
				detail:
					"Properly quoted material and trailing reference lists are excluded by default, and the thresholds are set per assignment.",
			},
			{
				title: "An index you control",
				detail:
					"Your corpus is built from your own submissions and reference material. Nothing is shared with other institutions.",
			},
		],
	},
	{
		slug: "feedback",
		name: "Attest Feedback",
		summary: "Comment on student writing where the writing happens.",
		audience: "Writing instructors",
		body: "Inline comments, reusable comment banks, and rubric-linked marking, attached to the same document the similarity report describes. Feedback and integrity stop being two separate tools.",
		features: [
			{
				title: "Reusable comment banks",
				detail:
					"Save the feedback you give most often and drop it in with one click, then edit for the individual student.",
			},
			{
				title: "Rubrics that travel",
				detail:
					"Attach a rubric to an assignment once and reuse it across sections and terms.",
			},
			{
				title: "Revision history",
				detail:
					"See what changed between drafts, so improvement is visible rather than assumed.",
			},
		],
	},
	{
		slug: "grade",
		name: "Attest Grade",
		summary: "Mark scanned exams and problem sets consistently at scale.",
		audience: "STEM faculty and teaching teams",
		body: "Group identical answers, grade them once, and apply the result to every matching submission. Change your mind halfway through and the rubric change propagates to work you already marked.",
		features: [
			{
				title: "Answer grouping",
				detail:
					"Similar answers are clustered so a teaching team marks a question, not a stack of papers.",
			},
			{
				title: "Retroactive rubric edits",
				detail:
					"Adjust point values after marking has started and every affected score updates.",
			},
			{
				title: "Per-question analytics",
				detail:
					"See which questions separated the cohort and which ones only measured confusion.",
			},
		],
	},
	{
		slug: "exam",
		name: "Attest Exam",
		summary: "Deliver high-stakes assessments under controlled conditions.",
		audience: "Programmes with licensure or certification exams",
		body: "Lock the testing environment, verify who is sitting the exam, and keep delivery working when the network does not.",
		features: [
			{
				title: "Offline-tolerant delivery",
				detail:
					"Exams continue through a dropped connection and sync when it returns.",
			},
			{
				title: "Environment lockdown",
				detail:
					"Restrict access to other applications, notes, and assistants for the duration of the sitting.",
			},
			{
				title: "Item analysis",
				detail:
					"Post-exam statistics on item difficulty and discrimination to inform the next sitting.",
			},
		],
	},
	{
		slug: "research",
		name: "Attest Research",
		summary:
			"Screen manuscripts, theses, and grant proposals before they are published.",
		audience: "Publishers, graduate schools, and research offices",
		body: "The same matching engine, pointed at the documents a research office cares about: submissions under review, prior theses, and internal reference collections.",
		features: [
			{
				title: "Pre-publication screening",
				detail:
					"Check a manuscript before it goes out, with a report an editor can act on.",
			},
			{
				title: "Thesis and dissertation review",
				detail:
					"Screen long documents without losing the passage-level detail that makes a report defensible.",
			},
			{
				title: "Bulk submission",
				detail: "Queue a batch of documents and collect the reports together.",
			},
		],
	},
] as const;

export const SOLUTIONS = [
	{
		slug: "academic-integrity",
		name: "Academic integrity",
		summary:
			"Check originality across a course, a department, or an entire institution.",
		lede: "Integrity work fails when it is only a percentage on a dashboard. Attest is built so that every flag comes with the text behind it.",
		forWhom: "Instructors, integrity officers, and academic leadership",
		points: [
			"Matching that points at passages, with the source shown alongside",
			"Per-assignment thresholds for quotations, references, and minimum match length",
			"A corpus made of your own institution's work",
			"Reports students can see, so the process is not a black box",
		],
		products: ["similarity", "feedback"],
	},
	{
		slug: "research-integrity",
		name: "Research integrity",
		summary:
			"Screen theses, manuscripts, and proposals before they carry your institution's name.",
		lede: "Research offices and publishers need the same evidence standard as a classroom, applied to much longer documents.",
		forWhom: "Research offices, graduate schools, and publishers",
		points: [
			"Long-document screening that keeps passage-level detail",
			"Batch submission and collected reporting",
			"Reference collections you curate and control",
			"Reports built for an editorial decision, not a grade",
		],
		products: ["research", "similarity"],
	},
	{
		slug: "course-assessment",
		name: "Course assessment",
		summary:
			"Mark consistently, give feedback that lands, and see what the cohort understood.",
		lede: "Assessment tooling should reduce the marking load without flattening the feedback students actually read.",
		forWhom: "Course instructors and teaching assistants",
		points: [
			"Group identical answers and grade them once",
			"Rubrics that can be corrected mid-marking",
			"Reusable comment banks for common feedback",
			"Per-question analytics on what the cohort missed",
		],
		products: ["grade", "feedback"],
	},
	{
		slug: "high-stakes-assessment",
		name: "High-stakes assessment",
		summary:
			"Run licensure and certification exams under controlled conditions.",
		lede: "When an exam decides whether someone can practise, delivery has to hold up — including when the network does not.",
		forWhom: "Certification bodies and professional programmes",
		points: [
			"Locked-down testing environments",
			"Identity verification at the point of sitting",
			"Offline-tolerant delivery with later sync",
			"Item analysis after every sitting",
		],
		products: ["exam", "grade"],
	},
] as const;

export const NAV: NavGroup[] = [
	{
		label: "Solutions",
		items: SOLUTIONS.map((s) => ({
			label: s.name,
			to: `/solutions/${s.slug}`,
			description: s.summary,
		})),
	},
	{
		label: "Products",
		items: PRODUCTS.map((p) => ({
			label: p.name,
			to: `/products/${p.slug}`,
			description: p.summary,
		})),
	},
	{ label: "Customer stories", to: "/customer-stories" },
	{ label: "About", to: "/about" },
];

export const FOOTER_GROUPS = [
	{
		title: "Solutions",
		links: SOLUTIONS.map((s) => ({
			label: s.name,
			to: `/solutions/${s.slug}`,
		})),
	},
	{
		title: "Products",
		links: PRODUCTS.map((p) => ({ label: p.name, to: `/products/${p.slug}` })),
	},
	{
		title: "Resources",
		links: [
			{ label: "Customer stories", to: "/customer-stories" },
			{ label: "How matching works", to: "/products/similarity" },
			{ label: "Contact sales", to: "/contact" },
		],
	},
	{
		title: "Company",
		links: [
			{ label: "About", to: "/about" },
			{ label: "Contact", to: "/contact" },
			{ label: "Sign in", to: "/login" },
		],
	},
];

export const HOME = {
	hero: {
		eyebrow: "Integrity, with the evidence attached",
		title: "Know where the words came from.",
		body: "Attest checks student and researcher writing against your institution's own corpus, shows the matching passages side by side, and gives you the context to have a fair conversation about them.",
		primaryCta: { label: "Try the checker", to: "/app" },
		secondaryCta: { label: "Talk to us", to: "/contact" },
	},
	promos: [
		{
			eyebrow: "Similarity",
			title: "Reports that point at sentences",
			body: "A percentage starts an argument. A highlighted passage next to its source starts a conversation.",
			to: "/products/similarity",
			cta: "See how matching works",
		},
		{
			eyebrow: "AI and writing",
			title: "Signals, stated honestly",
			body: "We show writing-style statistics and say plainly what they can and cannot tell you. No tool should accuse a student on its own.",
			to: "/about",
			cta: "Read our position",
		},
		{
			eyebrow: "Assessment",
			title: "Marking that scales without flattening",
			body: "Group identical answers, fix a rubric mid-marking, and keep the feedback students actually read.",
			to: "/products/grade",
			cta: "Explore assessment",
		},
	],
	trust: {
		stat: "Built for institutions of every size",
		body: "From a single writing course to a multi-campus research office, the same engine and the same evidence standard.",
		items: [
			"Universities",
			"Secondary schools",
			"Research offices",
			"Publishers",
			"Certification bodies",
		],
	},
	pillars: [
		{
			title: "Learning integrity",
			body: "Check originality, surface matching passages, and give students a report they can read and respond to.",
			to: "/solutions/academic-integrity",
		},
		{
			title: "Secure assessment",
			body: "Deliver exams under controlled conditions, verify identity, and keep working through a dropped connection.",
			to: "/solutions/high-stakes-assessment",
		},
		{
			title: "Research integrity",
			body: "Screen theses, manuscripts, and proposals against the collections your research office actually cares about.",
			to: "/solutions/research-integrity",
		},
	],
	testimonials: [
		{
			quote:
				"The passage view changed how we handle these cases. We stopped arguing about a percentage and started talking about specific paragraphs.",
			name: "Directorate of Academic Standards",
			role: "Illustrative example",
		},
		{
			quote:
				"Being able to set the minimum match length per assignment meant our methods courses stopped flagging standard phrasing every single time.",
			name: "Faculty of Social Sciences",
			role: "Illustrative example",
		},
		{
			quote:
				"Our graduate school screens every thesis before submission now. The batch reports made that possible without adding staff.",
			name: "Graduate Research Office",
			role: "Illustrative example",
		},
	],
	closing: {
		title: "See a real report on a real document.",
		body: "Create an account, upload something, and look at the output before you decide anything.",
		cta: { label: "Open the checker", to: "/app" },
	},
};
