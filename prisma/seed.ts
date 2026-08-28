import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { auth } from "../src/server/auth.ts";
import { db } from "../src/server/db.ts";
import { processSubmission } from "../src/server/pipeline.ts";
import { getStorage, storageKeys } from "../src/server/storage/index.ts";

/**
 * Creates an instructor, two students, a class with one assignment, and a small
 * reference corpus — so the first report anyone generates has something to
 * match against instead of coming back empty and looking broken.
 */

const PASSWORD = "attest-demo-2026";

const PEOPLE = [
	{ name: "Dr Amara Okonjo", email: "instructor@attest.test", role: "INSTRUCTOR" },
	{ name: "Priya Raghunathan", email: "student1@attest.test", role: "STUDENT" },
	{ name: "Tomas Lindqvist", email: "student2@attest.test", role: "STUDENT" },
] as const;

async function ensureUser(person: (typeof PEOPLE)[number]) {
	const existing = await db.user.findUnique({
		where: { email: person.email },
		include: { accounts: { select: { id: true } } },
	});
	// A user row with no linked account has no password and cannot sign in —
	// which happens if a previous seed died partway through sign-up.
	if (existing && existing.accounts.length > 0) return existing;
	if (existing) {
		console.log(`  · ${person.email} had no credentials; recreating`);
		await db.user.delete({ where: { id: existing.id } });
	}

	// Go through Better Auth so the password is hashed the way sign-in expects.
	await auth.api.signUpEmail({
		body: {
			name: person.name,
			email: person.email,
			password: PASSWORD,
			role: person.role,
		},
	});
	const created = await db.user.findUniqueOrThrow({
		where: { email: person.email },
	});
	// signUpEmail applies the default role when the field isn't echoed back.
	if (created.role !== person.role) {
		return await db.user.update({
			where: { id: created.id },
			data: { role: person.role },
		});
	}
	return created;
}

async function seedReferenceDocuments() {
	const dir = join(process.cwd(), "prisma", "fixtures");
	const files = (await readdir(dir)).filter((name) =>
		name.startsWith("reference-"),
	);

	for (const filename of files) {
		const existing = await db.submission.findFirst({
			where: { filename, isReference: true },
		});
		if (existing) {
			console.log(`  · ${filename} already indexed`);
			continue;
		}

		const contents = await readFile(join(dir, filename), "utf8");
		const submission = await db.submission.create({
			data: {
				filename,
				mimeType: "text/plain",
				sizeBytes: Buffer.byteLength(contents),
				storageKey: "",
				isReference: true,
				sourceLabel: contents.split("\n")[0],
				status: "UPLOADED",
			},
		});

		const storageKey = storageKeys.original(submission.id, filename);
		await getStorage().put(storageKey, contents, "text/plain");
		await db.submission.update({
			where: { id: submission.id },
			data: { storageKey },
		});

		await processSubmission(submission.id);
		console.log(`  · indexed ${filename}`);
	}
}

async function main() {
	console.log("Seeding users…");
	const [instructor, studentA, studentB] = await Promise.all(
		PEOPLE.map(ensureUser),
	);

	console.log("Seeding class and assignment…");
	const klass = await db.class.upsert({
		where: { joinCode: "BIO140" },
		update: {},
		create: {
			title: "Biology 140: Cells and Energy",
			description:
				"Introductory cell biology. Written work is checked for originality against the course corpus.",
			joinCode: "BIO140",
			instructorId: instructor.id,
		},
	});

	for (const student of [studentA, studentB]) {
		await db.enrollment.upsert({
			where: { userId_classId: { userId: student.id, classId: klass.id } },
			create: { userId: student.id, classId: klass.id },
			update: {},
		});
	}

	const existingAssignment = await db.assignment.findFirst({
		where: { classId: klass.id, title: "Essay 1: Energy in the cell" },
	});
	if (!existingAssignment) {
		await db.assignment.create({
			data: {
				classId: klass.id,
				title: "Essay 1: Energy in the cell",
				instructions:
					"Explain how cells produce and manage energy. Quote sparingly and cite everything you quote.",
				minMatchWords: 8,
			},
		});
	}

	console.log("Indexing reference documents…");
	await seedReferenceDocuments();

	console.log("\nDone. Sign in with any of:");
	for (const person of PEOPLE) {
		console.log(`  ${person.email}  /  ${PASSWORD}   (${person.role})`);
	}
	console.log(
		"\nUpload prisma/fixtures/student-essay-with-lifted-passage.txt to see a\n" +
			"non-empty similarity report — it reuses a paragraph from the cell\n" +
			"biology reference document.",
	);
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await db.$disconnect();
	});
