import { randomUUID } from "node:crypto";
import { Router } from "express";
import { asc, isNotNull } from "drizzle-orm";
import {
  CreateAdminSupportRequestCommentBody,
  CreateAdminSupportRequestCommentParams,
  CreateAdminSupportRequestCommentResponse,
  CreateAdminSuggestionCategoryBody,
  CreateAdminSuggestionCategoryResponse,
  CreateAdminSupportSubjectBody,
  CreateAdminSupportSubjectResponse,
  CreateMySuggestionBody,
  CreateMySuggestionResponse,
  CreateSupportRequestBody,
  CreateSupportRequestResponse,
  ListPublicRoadmapSuggestionsResponse,
  ListAdminSupportRequestsResponse,
  ListAdminSuggestionCategoriesResponse,
  ListAdminSupportSubjectsResponse,
  ListMySupportRequestsResponse,
  ListMySuggestionsResponse,
  ListSuggestionCategoriesResponse,
  ListSupportSubjectsResponse,
  UpdateAdminSuggestionCategoryBody,
  UpdateAdminSuggestionCategoryParams,
  UpdateAdminSuggestionCategoryResponse,
  UpdateAdminSupportRequestBody,
  UpdateAdminSupportRequestParams,
  UpdateAdminSupportRequestResponse,
  UpdateAdminSupportRequestRoadmapBody,
  UpdateAdminSupportRequestRoadmapParams,
  UpdateAdminSupportRequestRoadmapResponse,
  UpdateAdminSupportSubjectBody,
  UpdateAdminSupportSubjectParams,
  UpdateAdminSupportSubjectResponse,
} from "@workspace/api-zod";
import {
  and,
  db,
  desc,
  eq,
  inArray,
  notificationsTable,
  sql,
  supportRequestCategoriesTable,
  supportRequestCommentsTable,
  supportRequestSequencesTable,
  supportRequestsTable,
  supportRequestSubjectsTable,
  usersTable,
} from "@workspace/db";
import {
  getPfvlUser,
  requireAdmin,
  requirePfvlUser,
} from "../lib/pfvl-auth.js";
import type {
  PfvlRequest as ExpressRequest,
  PfvlResponse as ExpressResponse,
} from "../lib/route-types.js";

const router = Router();

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

type NewRequest = {
  user: ReturnType<typeof getPfvlUser>;
  requestType: "support" | "suggestion";
  message: string;
  subjectId?: number;
  title?: string;
  categoryId?: number;
};

async function createTrackedRequest(input: NewRequest) {
  const year = new Date().getFullYear();
  if (year < 1000 || year > 9999) return { error: "sequence" as const };

  return db.transaction(async (tx) => {
    const subjectFilter =
      input.requestType === "suggestion"
        ? and(
            eq(supportRequestSubjectsTable.systemKey, "suggestion"),
            eq(supportRequestSubjectsTable.active, true),
          )
        : and(
            eq(supportRequestSubjectsTable.id, input.subjectId ?? -1),
            eq(supportRequestSubjectsTable.active, true),
          );
    const [subject] = await tx
      .select()
      .from(supportRequestSubjectsTable)
      .where(subjectFilter)
      .limit(1);
    if (!subject) return { error: "subject" as const };

    let categoryName: string | null = null;
    if (input.requestType === "suggestion") {
      const [category] = await tx
        .select()
        .from(supportRequestCategoriesTable)
        .where(
          and(
            eq(supportRequestCategoriesTable.id, input.categoryId ?? -1),
            eq(supportRequestCategoriesTable.subjectId, subject.id),
            eq(supportRequestCategoriesTable.active, true),
          ),
        )
        .limit(1);
      if (!category) return { error: "category" as const };
      categoryName = category.name;
    }

    const [counter] = await tx
      .insert(supportRequestSequencesTable)
      .values({ year, lastSequence: 1 })
      .onConflictDoUpdate({
        target: supportRequestSequencesTable.year,
        set: {
          lastSequence: sql`${supportRequestSequencesTable.lastSequence} + 1`,
        },
      })
      .returning({ lastSequence: supportRequestSequencesTable.lastSequence });

    if (!counter || counter.lastSequence > 99_999_999) {
      return { error: "sequence" as const };
    }

    const protocol = `${String(year).padStart(4, "0")}${String(
      counter.lastSequence,
    ).padStart(8, "0")}`;
    const [created] = await tx
      .insert(supportRequestsTable)
      .values({
        protocol,
        requestYear: year,
        requestSequence: counter.lastSequence,
        requestType: input.requestType,
        subjectId: subject.id,
        subjectName: subject.name,
        title: input.title ?? null,
        categoryId: input.categoryId ?? null,
        categoryName,
        requesterUserId: input.user.id,
        requesterName: input.user.displayName,
        requesterEmail: input.user.email,
        message: input.message,
        status: "new",
      })
      .returning({
        id: supportRequestsTable.id,
        protocol: supportRequestsTable.protocol,
        createdAt: supportRequestsTable.createdAt,
      });

    if (input.requestType === "suggestion") {
      const admins = await tx
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(
          and(
            eq(usersTable.role, "admin"),
            eq(usersTable.status, "active"),
          ),
        );
      const notificationRows = admins
        .filter((admin) => admin.id !== input.user.id)
        .map((admin) => ({
          recipientUserId: admin.id,
          actorUserId: input.user.id,
          eventKey: `suggestion-request:${created.id}:new`,
          type: "new_suggestion",
          title: "Nova sugestão privada",
          message: `${input.user.displayName}: ${input.title ?? "Sugestão"}`,
          href: "/admin",
        }));
      if (notificationRows.length) {
        await tx
          .insert(notificationsTable)
          .values(notificationRows)
          .onConflictDoNothing();
      }
    }

    return { created };
  });
}

async function attachRequestComments<
  T extends { id: number },
>(requests: T[]) {
  if (!requests.length) return requests.map((request) => ({ ...request, comments: [] }));
  const rows = await db
    .select({
      id: supportRequestCommentsTable.id,
      requestId: supportRequestCommentsTable.requestId,
      authorName: supportRequestCommentsTable.authorName,
      message: supportRequestCommentsTable.message,
      createdAt: supportRequestCommentsTable.createdAt,
    })
    .from(supportRequestCommentsTable)
    .where(inArray(supportRequestCommentsTable.requestId, requests.map(({ id }) => id)))
    .orderBy(supportRequestCommentsTable.createdAt, supportRequestCommentsTable.id);
  const commentsByRequest = new Map<number, typeof rows>();
  for (const row of rows) {
    const comments = commentsByRequest.get(row.requestId) ?? [];
    comments.push(row);
    commentsByRequest.set(row.requestId, comments);
  }
  return requests.map((request) => ({
    ...request,
    comments: (commentsByRequest.get(request.id) ?? []).map(
      ({ requestId: _requestId, ...comment }) => comment,
    ),
  }));
}

router.get(
  "/support-subjects",
  async (_req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const subjects = await db
      .select()
      .from(supportRequestSubjectsTable)
      .where(eq(supportRequestSubjectsTable.active, true))
      .orderBy(supportRequestSubjectsTable.name);
    res.json(ListSupportSubjectsResponse.parse(subjects));
  },
);

router.post(
  "/support-requests",
  requirePfvlUser,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const parsed = CreateSupportRequestBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const result = await createTrackedRequest({
      user: getPfvlUser(req),
      requestType: "support",
      subjectId: parsed.data.subjectId,
      message: parsed.data.message.trim(),
    });

    if ("error" in result) {
      if (result.error === "subject") {
        res.status(404).json({ error: "Este assunto não está mais disponível" });
        return;
      }
      res.status(503).json({ error: "Não foi possível gerar o protocolo anual" });
      return;
    }

    res
      .status(201)
      .json(CreateSupportRequestResponse.parse(result.created));
  },
);

router.get(
  "/my/support-requests",
  requirePfvlUser,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const user = getPfvlUser(req);
    const requests = await db
      .select({
        id: supportRequestsTable.id,
        protocol: supportRequestsTable.protocol,
        subjectName: supportRequestsTable.subjectName,
        message: supportRequestsTable.message,
        status: supportRequestsTable.status,
        createdAt: supportRequestsTable.createdAt,
        updatedAt: supportRequestsTable.updatedAt,
      })
      .from(supportRequestsTable)
      .where(
        and(
          eq(supportRequestsTable.requesterUserId, user.id),
          eq(supportRequestsTable.requestType, "support"),
        ),
      )
      .orderBy(desc(supportRequestsTable.updatedAt), desc(supportRequestsTable.id));
    const withComments = await attachRequestComments(requests);
    res.json(ListMySupportRequestsResponse.parse(withComments));
  },
);

router.get(
  "/suggestion-categories",
  async (_req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const [subject] = await db
      .select({ id: supportRequestSubjectsTable.id })
      .from(supportRequestSubjectsTable)
      .where(
        and(
          eq(supportRequestSubjectsTable.systemKey, "suggestion"),
          eq(supportRequestSubjectsTable.active, true),
        ),
      )
      .limit(1);
    const categories = subject
      ? await db
          .select()
          .from(supportRequestCategoriesTable)
          .where(
            and(
              eq(supportRequestCategoriesTable.subjectId, subject.id),
              eq(supportRequestCategoriesTable.active, true),
            ),
          )
          .orderBy(supportRequestCategoriesTable.name)
      : [];
    res.json(ListSuggestionCategoriesResponse.parse(categories));
  },
);

router.get(
  "/roadmap/suggestions",
  async (_req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const suggestions = await db
      .select({
        id: supportRequestsTable.id,
        title: supportRequestsTable.title,
        categoryName: supportRequestsTable.categoryName,
        message: supportRequestsTable.message,
        status: supportRequestsTable.status,
        approvedAt: supportRequestsTable.approvedAt,
      })
      .from(supportRequestsTable)
      .where(
        and(
          eq(supportRequestsTable.requestType, "suggestion"),
          isNotNull(supportRequestsTable.approvedAt),
        ),
      )
      .orderBy(asc(supportRequestsTable.approvedAt), asc(supportRequestsTable.id));
    res.json(ListPublicRoadmapSuggestionsResponse.parse(suggestions));
  },
);

router.get(
  "/my/suggestions",
  requirePfvlUser,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const user = getPfvlUser(req);
    const requests = await db
      .select({
        id: supportRequestsTable.id,
        protocol: supportRequestsTable.protocol,
        subjectName: supportRequestsTable.subjectName,
        title: supportRequestsTable.title,
        categoryName: supportRequestsTable.categoryName,
        message: supportRequestsTable.message,
        status: supportRequestsTable.status,
        createdAt: supportRequestsTable.createdAt,
        updatedAt: supportRequestsTable.updatedAt,
      })
      .from(supportRequestsTable)
      .where(
        and(
          eq(supportRequestsTable.requesterUserId, user.id),
          eq(supportRequestsTable.requestType, "suggestion"),
        ),
      )
      .orderBy(desc(supportRequestsTable.createdAt), desc(supportRequestsTable.id));
    const withComments = await attachRequestComments(requests);
    res.json(ListMySuggestionsResponse.parse(withComments));
  },
);

router.post(
  "/my/suggestions",
  requirePfvlUser,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const parsed = CreateMySuggestionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const result = await createTrackedRequest({
      user: getPfvlUser(req),
      requestType: "suggestion",
      title: parsed.data.title.trim(),
      categoryId: parsed.data.categoryId,
      message: parsed.data.message.trim(),
    });
    if ("error" in result) {
      if (result.error === "subject") {
        res.status(404).json({ error: "O assunto Sugestão está temporariamente indisponível" });
        return;
      }
      if (result.error === "category") {
        res.status(404).json({ error: "Esta categoria não está mais disponível" });
        return;
      }
      res.status(503).json({ error: "Não foi possível gerar o protocolo anual" });
      return;
    }
    res.status(201).json(CreateMySuggestionResponse.parse(result.created));
  },
);

router.get(
  "/admin/support-subjects",
  requirePfvlUser,
  requireAdmin,
  async (_req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const subjects = await db
      .select()
      .from(supportRequestSubjectsTable)
      .orderBy(supportRequestSubjectsTable.name);
    res.json(ListAdminSupportSubjectsResponse.parse(subjects));
  },
);

router.get(
  "/admin/suggestion-categories",
  requirePfvlUser,
  requireAdmin,
  async (_req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const [subject] = await db
      .select({ id: supportRequestSubjectsTable.id })
      .from(supportRequestSubjectsTable)
      .where(eq(supportRequestSubjectsTable.systemKey, "suggestion"))
      .limit(1);
    const categories = subject
      ? await db
          .select()
          .from(supportRequestCategoriesTable)
          .where(eq(supportRequestCategoriesTable.subjectId, subject.id))
          .orderBy(supportRequestCategoriesTable.name)
      : [];
    res.json(ListAdminSuggestionCategoriesResponse.parse(categories));
  },
);

router.post(
  "/admin/suggestion-categories",
  requirePfvlUser,
  requireAdmin,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const parsed = CreateAdminSuggestionCategoryBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const name = parsed.data.name.trim().replace(/\s+/g, " ");
    if (name.length < 2) {
      res.status(400).json({ error: "Informe uma categoria com pelo menos 2 caracteres" });
      return;
    }
    const [subject] = await db
      .select({ id: supportRequestSubjectsTable.id })
      .from(supportRequestSubjectsTable)
      .where(eq(supportRequestSubjectsTable.systemKey, "suggestion"))
      .limit(1);
    if (!subject) {
      res.status(404).json({ error: "O assunto Sugestão não foi configurado" });
      return;
    }
    try {
      const [created] = await db
        .insert(supportRequestCategoriesTable)
        .values({ subjectId: subject.id, name })
        .returning();
      res.status(201).json(CreateAdminSuggestionCategoryResponse.parse(created));
    } catch (error) {
      if (isUniqueViolation(error)) {
        res.status(409).json({ error: "Já existe uma categoria com esse nome" });
        return;
      }
      throw error;
    }
  },
);

router.patch(
  "/admin/suggestion-categories/:categoryId",
  requirePfvlUser,
  requireAdmin,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const params = UpdateAdminSuggestionCategoryParams.safeParse(req.params);
    const parsed = UpdateAdminSuggestionCategoryBody.safeParse(req.body);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [subject] = await db
      .select({ id: supportRequestSubjectsTable.id })
      .from(supportRequestSubjectsTable)
      .where(eq(supportRequestSubjectsTable.systemKey, "suggestion"))
      .limit(1);
    if (!subject) {
      res.status(404).json({ error: "O assunto Sugestão não foi configurado" });
      return;
    }
    const changes: Partial<typeof supportRequestCategoriesTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (parsed.data.name !== undefined) {
      const name = parsed.data.name.trim().replace(/\s+/g, " ");
      if (name.length < 2) {
        res.status(400).json({ error: "Informe uma categoria com pelo menos 2 caracteres" });
        return;
      }
      const [duplicate] = await db
        .select({ id: supportRequestCategoriesTable.id })
        .from(supportRequestCategoriesTable)
        .where(
          and(
            eq(supportRequestCategoriesTable.subjectId, subject.id),
            sql`lower(${supportRequestCategoriesTable.name}) = lower(${name})`,
            sql`${supportRequestCategoriesTable.id} <> ${params.data.categoryId}`,
          ),
        )
        .limit(1);
      if (duplicate) {
        res.status(409).json({ error: "Já existe uma categoria com esse nome" });
        return;
      }
      changes.name = name;
    }
    if (parsed.data.active !== undefined) changes.active = parsed.data.active;
    try {
      const [updated] = await db
        .update(supportRequestCategoriesTable)
        .set(changes)
        .where(
          and(
            eq(supportRequestCategoriesTable.id, params.data.categoryId),
            eq(supportRequestCategoriesTable.subjectId, subject.id),
          ),
        )
        .returning();
      if (!updated) {
        res.status(404).json({ error: "Categoria não encontrada" });
        return;
      }
      res.json(UpdateAdminSuggestionCategoryResponse.parse(updated));
    } catch (error) {
      if (isUniqueViolation(error)) {
        res.status(409).json({ error: "Já existe uma categoria com esse nome" });
        return;
      }
      throw error;
    }
  },
);

router.post(
  "/admin/support-subjects",
  requirePfvlUser,
  requireAdmin,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const parsed = CreateAdminSupportSubjectBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const name = parsed.data.name.trim().replace(/\s+/g, " ");
    if (name.length < 2) {
      res.status(400).json({ error: "Informe um assunto com pelo menos 2 caracteres" });
      return;
    }
    const [existing] = await db
      .select({ id: supportRequestSubjectsTable.id })
      .from(supportRequestSubjectsTable)
      .where(sql`lower(${supportRequestSubjectsTable.name}) = lower(${name})`)
      .limit(1);
    if (existing) {
      res.status(409).json({ error: "Já existe um assunto com esse nome" });
      return;
    }

    try {
      const [created] = await db
        .insert(supportRequestSubjectsTable)
        .values({ name })
        .returning();
      res
        .status(201)
        .json(CreateAdminSupportSubjectResponse.parse(created));
    } catch (error) {
      if (isUniqueViolation(error)) {
        res.status(409).json({ error: "Já existe um assunto com esse nome" });
        return;
      }
      throw error;
    }
  },
);

router.patch(
  "/admin/support-subjects/:subjectId",
  requirePfvlUser,
  requireAdmin,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const params = UpdateAdminSupportSubjectParams.safeParse(req.params);
    const parsed = UpdateAdminSupportSubjectBody.safeParse(req.body);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const changes: Partial<typeof supportRequestSubjectsTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (parsed.data.name !== undefined) {
      const name = parsed.data.name.trim().replace(/\s+/g, " ");
      if (name.length < 2) {
        res.status(400).json({ error: "Informe um assunto com pelo menos 2 caracteres" });
        return;
      }
      const [duplicate] = await db
        .select({ id: supportRequestSubjectsTable.id })
        .from(supportRequestSubjectsTable)
        .where(
          and(
            sql`lower(${supportRequestSubjectsTable.name}) = lower(${name})`,
            sql`${supportRequestSubjectsTable.id} <> ${params.data.subjectId}`,
          ),
        )
        .limit(1);
      if (duplicate) {
        res.status(409).json({ error: "Já existe um assunto com esse nome" });
        return;
      }
      changes.name = name;
    }
    if (parsed.data.active !== undefined) changes.active = parsed.data.active;

    try {
      const [updated] = await db
        .update(supportRequestSubjectsTable)
        .set(changes)
        .where(eq(supportRequestSubjectsTable.id, params.data.subjectId))
        .returning();
      if (!updated) {
        res.status(404).json({ error: "Assunto não encontrado" });
        return;
      }
      res.json(UpdateAdminSupportSubjectResponse.parse(updated));
    } catch (error) {
      if (isUniqueViolation(error)) {
        res.status(409).json({ error: "Já existe um assunto com esse nome" });
        return;
      }
      throw error;
    }
  },
);

router.get(
  "/admin/support-requests",
  requirePfvlUser,
  requireAdmin,
  async (_req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const [requests, groupedCounts] = await Promise.all([
      db
        .select({
          id: supportRequestsTable.id,
          protocol: supportRequestsTable.protocol,
        requestType: supportRequestsTable.requestType,
          subjectName: supportRequestsTable.subjectName,
        title: supportRequestsTable.title,
        categoryName: supportRequestsTable.categoryName,
          approvedAt: supportRequestsTable.approvedAt,
          requesterName: supportRequestsTable.requesterName,
          requesterEmail: supportRequestsTable.requesterEmail,
          message: supportRequestsTable.message,
          status: supportRequestsTable.status,
          createdAt: supportRequestsTable.createdAt,
          updatedAt: supportRequestsTable.updatedAt,
        })
        .from(supportRequestsTable)
        .orderBy(desc(supportRequestsTable.createdAt), desc(supportRequestsTable.id)),
      db
        .select({
          status: supportRequestsTable.status,
          count: sql<number>`count(*)::int`,
        })
        .from(supportRequestsTable)
        .groupBy(supportRequestsTable.status),
    ]);
    const requestsWithComments = await attachRequestComments(requests);
    const counts = { new: 0, inProgress: 0, completed: 0 };
    for (const row of groupedCounts) {
      if (row.status === "new") counts.new = row.count;
      if (row.status === "in_progress") counts.inProgress = row.count;
      if (row.status === "completed") counts.completed = row.count;
    }
    res.json(
      ListAdminSupportRequestsResponse.parse({
        requests: requestsWithComments,
        counts,
      }),
    );
  },
);

router.patch(
  "/admin/support-requests/:requestId",
  requirePfvlUser,
  requireAdmin,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const params = UpdateAdminSupportRequestParams.safeParse(req.params);
    const parsed = UpdateAdminSupportRequestBody.safeParse(req.body);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const result = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({
          id: supportRequestsTable.id,
          requestType: supportRequestsTable.requestType,
          subjectName: supportRequestsTable.subjectName,
          title: supportRequestsTable.title,
          requesterUserId: supportRequestsTable.requesterUserId,
          status: supportRequestsTable.status,
        })
        .from(supportRequestsTable)
        .where(eq(supportRequestsTable.id, params.data.requestId))
        .limit(1);
      if (!existing) return null;
      const [updated] = await tx
        .update(supportRequestsTable)
        .set({ status: parsed.data.status, updatedAt: new Date() })
        .where(eq(supportRequestsTable.id, params.data.requestId))
        .returning({
          id: supportRequestsTable.id,
          protocol: supportRequestsTable.protocol,
          requestType: supportRequestsTable.requestType,
          subjectName: supportRequestsTable.subjectName,
          title: supportRequestsTable.title,
          categoryName: supportRequestsTable.categoryName,
          approvedAt: supportRequestsTable.approvedAt,
          requesterName: supportRequestsTable.requesterName,
          requesterEmail: supportRequestsTable.requesterEmail,
          message: supportRequestsTable.message,
          status: supportRequestsTable.status,
          createdAt: supportRequestsTable.createdAt,
          updatedAt: supportRequestsTable.updatedAt,
        });
      if (
        existing.requestType === "suggestion" &&
        existing.requesterUserId !== null &&
        existing.status !== parsed.data.status
      ) {
        const statusLabel =
          parsed.data.status === "new"
            ? "recebida"
            : parsed.data.status === "in_progress"
              ? "em andamento"
              : "concluída";
        await tx
          .insert(notificationsTable)
          .values({
            recipientUserId: existing.requesterUserId,
            actorUserId: getPfvlUser(req).id,
            eventKey: `suggestion-request:${existing.id}:status:${randomUUID()}`,
            type: "suggestion_status",
            title: "Sua sugestão foi atualizada",
            message: `${existing.title ?? existing.subjectName} está ${statusLabel}.`,
            href: "/suggestions",
          })
          .onConflictDoNothing();
      }
      return updated ?? null;
    });
    if (!result) {
      res.status(404).json({ error: "Solicitação não encontrada" });
      return;
    }
    const withComments = await attachRequestComments([result]);
    res.json(UpdateAdminSupportRequestResponse.parse(withComments[0]));
  },
);

router.patch(
  "/admin/support-requests/:requestId/roadmap",
  requirePfvlUser,
  requireAdmin,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const params = UpdateAdminSupportRequestRoadmapParams.safeParse(req.params);
    const parsed = UpdateAdminSupportRequestRoadmapBody.safeParse(req.body);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const admin = getPfvlUser(req);
    const result = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({
          id: supportRequestsTable.id,
          requestType: supportRequestsTable.requestType,
          title: supportRequestsTable.title,
          requesterUserId: supportRequestsTable.requesterUserId,
          approvedAt: supportRequestsTable.approvedAt,
        })
        .from(supportRequestsTable)
        .where(eq(supportRequestsTable.id, params.data.requestId))
        .limit(1);
      if (!existing || existing.requestType !== "suggestion") return null;

      const wasApproved = existing.approvedAt !== null;
      if (wasApproved === parsed.data.approved) {
        return { id: existing.id, approvedAt: existing.approvedAt };
      }

      const approvedAt = parsed.data.approved ? new Date() : null;
      const [updated] = await tx
        .update(supportRequestsTable)
        .set({ approvedAt, updatedAt: new Date() })
        .where(eq(supportRequestsTable.id, existing.id))
        .returning({
          id: supportRequestsTable.id,
          approvedAt: supportRequestsTable.approvedAt,
        });

      if (existing.requesterUserId !== null) {
        await tx
          .insert(notificationsTable)
          .values({
            recipientUserId: existing.requesterUserId,
            actorUserId: admin.id,
            eventKey: `suggestion-request:${existing.id}:roadmap:${parsed.data.approved ? "approved" : "removed"}:${randomUUID()}`,
            type: "suggestion_status",
            title: parsed.data.approved
              ? "Sua sugestão foi aprovada para o roadmap"
              : "Sua sugestão foi retirada do roadmap público",
            message: existing.title ?? "Sugestão",
            href: "/suggestions",
          })
          .onConflictDoNothing();
      }
      return updated ?? null;
    });

    if (!result) {
      res.status(404).json({ error: "Sugestão não encontrada" });
      return;
    }
    res.json(UpdateAdminSupportRequestRoadmapResponse.parse(result));
  },
);

router.post(
  "/admin/support-requests/:requestId/comments",
  requirePfvlUser,
  requireAdmin,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const params = CreateAdminSupportRequestCommentParams.safeParse(req.params);
    const parsed = CreateAdminSupportRequestCommentBody.safeParse(req.body);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [request] = await db
      .select({ id: supportRequestsTable.id })
      .from(supportRequestsTable)
      .where(eq(supportRequestsTable.id, params.data.requestId))
      .limit(1);
    if (!request) {
      res.status(404).json({ error: "Solicitação não encontrada" });
      return;
    }
    const admin = getPfvlUser(req);
    const result = await db.transaction(async (tx) => {
      const [requestDetails] = await tx
        .select({
          id: supportRequestsTable.id,
          requestType: supportRequestsTable.requestType,
          requesterUserId: supportRequestsTable.requesterUserId,
          title: supportRequestsTable.title,
          subjectName: supportRequestsTable.subjectName,
        })
        .from(supportRequestsTable)
        .where(eq(supportRequestsTable.id, request.id))
        .limit(1);
      if (!requestDetails) return null;
      const [created] = await tx
        .insert(supportRequestCommentsTable)
        .values({
          requestId: request.id,
          authorUserId: admin.id,
          authorName: admin.displayName,
          message: parsed.data.message.trim(),
        })
        .returning({
          id: supportRequestCommentsTable.id,
          authorName: supportRequestCommentsTable.authorName,
          message: supportRequestCommentsTable.message,
          createdAt: supportRequestCommentsTable.createdAt,
        });
      await tx
        .update(supportRequestsTable)
        .set({ updatedAt: new Date() })
        .where(eq(supportRequestsTable.id, request.id));
      if (
        requestDetails.requestType === "suggestion" &&
        requestDetails.requesterUserId !== null
      ) {
        await tx
          .insert(notificationsTable)
          .values({
            recipientUserId: requestDetails.requesterUserId,
            actorUserId: admin.id,
            eventKey: `suggestion-request:${requestDetails.id}:comment:${randomUUID()}`,
            type: "comment_reply",
            title: "A equipe respondeu à sua sugestão",
            message: requestDetails.title ?? requestDetails.subjectName,
            href: "/suggestions",
          })
          .onConflictDoNothing();
      }
      return created ?? null;
    });
    if (!result) {
      res.status(404).json({ error: "Solicitação não encontrada" });
      return;
    }
    res
      .status(201)
      .json(CreateAdminSupportRequestCommentResponse.parse(result));
  },
);

export default router;
