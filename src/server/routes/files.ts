import { Hono } from "hono";
import { z } from "zod";
import { auth } from "../auth.ts";
import { db } from "../db.ts";
import { env } from "../env.ts";
import { ACCEPTED_MIME_TYPES, resolveMimeType } from "../extract/index.ts";
import { processSubmission } from "../pipeline.ts";
import { getStorage, storageKeys } from "../storage/index.ts";

const uploadFields = z.object({
	assignmentId: z.string().min(1).optional(),
});

/**
 * Binary endpoints. These sit in Hono rather than tRPC because multipart upload
 * and byte streaming are exactly what a typed RPC layer is bad at.
 */
export const filesRoutes = new Hono();

filesRoutes.post("/", async (c) => {
	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	if (!session) return c.json({ error: "Sign in to upload." }, 401);

	const form = await c.req.formData();
	const file = form.get("file");
	if (!(file instanceof File)) {
		return c.json({ error: "No file was included in the upload." }, 400);
	}

	const fields = uploadFields.safeParse({
		assignmentId: form.get("assignmentId") ?? undefined,
	});
	if (!fields.success) {
		return c.json({ error: "Invalid upload fields." }, 400);
	}

	if (file.size === 0) return c.json({ error: "That file is empty." }, 400);
	if (file.size > env.MAX_UPLOAD_BYTES) {
		const limitMb = Math.round(env.MAX_UPLOAD_BYTES / (1024 * 1024));
		return c.json({ error: `Files must be under ${limitMb}MB.` }, 413);
	}

	const mimeType = resolveMimeType(file.name, file.type);
	if (!(ACCEPTED_MIME_TYPES as readonly string[]).includes(mimeType)) {
		return c.json(
			{ error: "Unsupported file type. Use PDF, DOCX, TXT, MD, or an image." },
			415,
		);
	}

	// A submission must belong to an assignment the student is enrolled in.
	if (fields.data.assignmentId) {
		const assignment = await db.assignment.findUnique({
			where: { id: fields.data.assignmentId },
			select: { id: true, class: { select: { instructorId: true } } },
		});
		if (!assignment) return c.json({ error: "Assignment not found." }, 404);

		const enrolled = await db.enrollment.findFirst({
			where: {
				userId: session.user.id,
				class: { assignments: { some: { id: assignment.id } } },
			},
			select: { id: true },
		});
		if (!enrolled && assignment.class.instructorId !== session.user.id) {
			return c.json({ error: "You are not enrolled in this class." }, 403);
		}
	}

	const submission = await db.submission.create({
		data: {
			filename: file.name,
			mimeType,
			sizeBytes: file.size,
			storageKey: "",
			studentId: session.user.id,
			assignmentId: fields.data.assignmentId ?? null,
			status: "UPLOADED",
		},
	});

	const storageKey = storageKeys.original(submission.id, file.name);
	await getStorage().put(
		storageKey,
		new Uint8Array(await file.arrayBuffer()),
		mimeType,
	);
	await db.submission.update({
		where: { id: submission.id },
		data: { storageKey },
	});

	// Respond immediately; the client polls status while this runs.
	void processSubmission(submission.id);

	return c.json({ submissionId: submission.id }, 201);
});

filesRoutes.get("/:id", async (c) => {
	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	if (!session) return c.json({ error: "Sign in to view this file." }, 401);

	const submission = await db.submission.findUnique({
		where: { id: c.req.param("id") },
		select: {
			id: true,
			filename: true,
			mimeType: true,
			storageKey: true,
			textKey: true,
			studentId: true,
			isReference: true,
			assignment: { select: { class: { select: { instructorId: true } } } },
		},
	});
	if (!submission) return c.json({ error: "Not found." }, 404);

	const isOwner = submission.studentId === session.user.id;
	const isInstructor =
		submission.assignment?.class.instructorId === session.user.id;
	if (!isOwner && !isInstructor && !submission.isReference) {
		return c.json({ error: "You do not have access to this file." }, 403);
	}

	const storage = getStorage();

	if (c.req.query("variant") === "text") {
		if (!submission.textKey)
			return c.json({ error: "Not extracted yet." }, 409);
		return c.text(await storage.getText(submission.textKey));
	}

	// R2 can hand the browser a direct URL; local storage streams through here.
	const direct = await storage.signedUrl(submission.storageKey);
	if (direct) return c.redirect(direct, 302);

	const bytes = await storage.get(submission.storageKey);
	return c.body(new Uint8Array(bytes) as unknown as ArrayBuffer, 200, {
		"Content-Type": submission.mimeType,
		"Content-Disposition": `inline; filename="${encodeURIComponent(submission.filename)}"`,
	});
});
