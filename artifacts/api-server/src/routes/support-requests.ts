import { randomUUID } from "node:crypto";
import { Router } from "express";
import { asc, isNotNull, isNull } from "drizzle-orm";
import {
  CreateAdminSupportRequestStatusBody,
  CreateAdminSupportRequestStatusResponse,
  CreateAdminSupportRequestCommentBody,
  CreateAdminSupportRequestCommentParams,
  CreateAdminSupportRequestCommentResponse,
  CreateAdminPublicRoadmapStatusBody,
  CreateAdminPublicRoadmapStatusResponse,
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
  ListAdminSupportRequestStatusesQueryParams,
  ListAdminSupportRequestStatusesResponse,
  ListAdminPublicRoadmapStatusesResponse,
  ListAdminSuggestionCategoriesResponse,
  ListAdminSupportSubjectsResponse,
  ListMySupportRequestsResponse,
  ListMySuggestionsResponse,
  ReorderAdminPublicRoadmapStatusesBody,
  ReorderAdminPublicRoadmapStatusesResponse,
  ListSuggestionCategoriesResponse,
  ListSupportSubjectsResponse,
  UpdateAdminSuggestionCategoryBody,
  UpdateAdminSuggestionCategoryParams,
  UpdateAdminSuggestionCategoryResponse,
  UpdateAdminSupportRequestBody,
  UpdateAdminSupportRequestParams,
  UpdateAdminSupportRequestResponse,
  UpdateAdminSupportRequestStatusBody,
  UpdateAdminSupportRequestStatusParams,
  UpdateAdminSupportRequestStatusResponse,
  UpdateAdminSupportRequestRoadmapBody,
  UpdateAdminSupportRequestRoadmapParams,
  UpdateAdminSupportRequestRoadmapResponse,
  UpdateAdminPublicRoadmapStatusBody,
  UpdateAdminPublicRoadmapStatusParams,
  UpdateAdminPublicRoadmapStatusResponse,
  UpdateAdminSupportSubjectBody,
  UpdateAdminSupportSubjectParams,
  UpdateAdminSupportSubjectResponse,
  ReorderAdminSupportRequestStatusesBody,
  ReorderAdminSupportRequestStatusesResponse,
} from "@workspace/api-zod";
import {
  and,
  db,
  desc,
  eq,
  inArray,
  notificationsTable,
  publicRoadmapStatusesTable,
  sql,
  supportRequestCategoriesTable,
  supportRequestCommentsTable,
  supportRequestSequencesTable,
  supportRequestStatusesTable,
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

type RequestFlow = "support" | "suggestion";

const defaultRequestStatuses: Record<
  RequestFlow,
  Array<{
    key: string;
    label: string;
    labelEn: string;
    isInitial: boolean;
    sortOrder: number;
  }>
> = {
  support: [
    { key: "new", label: "Nova", labelEn: "New", isInitial: true, sortOrder: 0 },
    { key: "in_progress", label: "Em andamento", labelEn: "In progress", isInitial: false, sortOrder: 10 },
    { key: "completed", label: "Concluída", labelEn: "Completed", isInitial: false, sortOrder: 20 },
    { key: "postponed", label: "Adiada", labelEn: "Deferred", isInitial: false, sortOrder: 30 },
    { key: "cancelled", label: "Cancelada", labelEn: "Cancelled", isInitial: false, sortOrder: 40 },
  ],
  suggestion: [
    { key: "new", label: "Recebida", labelEn: "Received", isInitial: true, sortOrder: 0 },
    { key: "in_progress", label: "Em andamento", labelEn: "In progress", isInitial: false, sortOrder: 10 },
    { key: "completed", label: "Concluída", labelEn: "Completed", isInitial: false, sortOrder: 20 },
    { key: "not_approved", label: "Não aprovada", labelEn: "Not approved", isInitial: false, sortOrder: 30 },
  ],
};

const defaultPublicRoadmapStatuses = [
  { key: "planned", label: "Planejada", labelEn: "Planned", sortOrder: 0 },
  {
    key: "in_progress",
    label: "Em desenvolvimento",
    labelEn: "In development",
    sortOrder: 10,
  },
  { key: "available", label: "Disponível", labelEn: "Available", sortOrder: 20 },
] as const;

async function ensureDefaultPublicRoadmapStatuses() {
  await db
    .insert(publicRoadmapStatusesTable)
    .values(
      defaultPublicRoadmapStatuses.map((status) => ({
        ...status,
        active: true,
      })),
    )
    .onConflictDoNothing();
}

async function ensureDefaultRequestStatuses(requestType?: RequestFlow) {
  const flows: RequestFlow[] = requestType
    ? [requestType]
    : ["support", "suggestion"];
  const seeds = flows.flatMap((flow) =>
    defaultRequestStatuses[flow].map((status) => ({
      requestType: flow,
      ...status,
    })),
  );
  await db
    .insert(supportRequestStatusesTable)
    .values(seeds)
    .onConflictDoNothing();

  const catalog = await db
    .select({
      id: supportRequestStatusesTable.id,
      requestType: supportRequestStatusesTable.requestType,
      key: supportRequestStatusesTable.key,
    })
    .from(supportRequestStatusesTable)
    .where(inArray(supportRequestStatusesTable.requestType, flows));
  const catalogByKey = new Map(
    catalog.map((status) => [`${status.requestType}:${status.key}`, status]),
  );
  const missingRequests = await db
    .select({
      id: supportRequestsTable.id,
      requestType: supportRequestsTable.requestType,
      status: supportRequestsTable.status,
    })
    .from(supportRequestsTable)
    .where(
      and(
        isNull(supportRequestsTable.statusId),
        inArray(supportRequestsTable.requestType, flows),
      ),
    );
  for (const request of missingRequests) {
    const status = catalogByKey.get(`${request.requestType}:${request.status}`);
    if (!status) {
      throw new Error(
        `No status catalog entry exists for ${request.requestType}:${request.status}`,
      );
    }
    await db
      .update(supportRequestsTable)
      .set({ statusId: status.id })
      .where(
        and(
          eq(supportRequestsTable.id, request.id),
          isNull(supportRequestsTable.statusId),
        ),
      );
  }
}

async function attachRequestStatusLabels<
  T extends { status: string; requestType?: string },
>(requests: T[], requestType?: RequestFlow) {
  if (!requests.length) {
    return requests.map((request) => ({
      ...request,
      statusLabel: "",
      statusLabelEn: "",
    }));
  }
  const catalog = await db
    .select({
      requestType: supportRequestStatusesTable.requestType,
      key: supportRequestStatusesTable.key,
      label: supportRequestStatusesTable.label,
      labelEn: supportRequestStatusesTable.labelEn,
    })
    .from(supportRequestStatusesTable);
  const catalogByKey = new Map(
    catalog.map((status) => [`${status.requestType}:${status.key}`, status]),
  );
  return requests.map((request) => {
    const flow = requestType ?? request.requestType;
    if (flow !== "support" && flow !== "suggestion") {
      throw new Error("A request flow is required to resolve its status label");
    }
    const status = catalogByKey.get(`${flow}:${request.status}`);
    if (!status) {
      throw new Error(`No status catalog entry exists for ${flow}:${request.status}`);
    }
    return {
      ...request,
      statusLabel: status.label,
      statusLabelEn: status.labelEn,
    };
  });
}

async function createTrackedRequest(input: NewRequest) {
  const year = new Date().getFullYear();
  if (year < 1000 || year > 9999) return { error: "sequence" as const };
  await ensureDefaultRequestStatuses(input.requestType);

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

    const [initialStatus] = await tx
      .select({
        id: supportRequestStatusesTable.id,
        key: supportRequestStatusesTable.key,
      })
      .from(supportRequestStatusesTable)
      .where(
        and(
          eq(supportRequestStatusesTable.requestType, input.requestType),
          eq(supportRequestStatusesTable.isInitial, true),
          eq(supportRequestStatusesTable.active, true),
        ),
      )
      .limit(1);
    if (!initialStatus) return { error: "status" as const };

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
        statusId: initialStatus.id,
        subjectId: subject.id,
        subjectName: subject.name,
        title: input.title ?? null,
        categoryId: input.categoryId ?? null,
        categoryName,
        requesterUserId: input.user.id,
        requesterName: input.user.displayName,
        requesterEmail: input.user.email,
        message: input.message,
        status: initialStatus.key,
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
          href: `/admin?suggestionRequest=${created.id}`,
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
      if (result.error === "status") {
        res.status(503).json({ error: "O status inicial da solicitação não está configurado" });
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
    await ensureDefaultRequestStatuses("support");
    const withLabels = await attachRequestStatusLabels(requests, "support");
    const withComments = await attachRequestComments(withLabels);
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
    await ensureDefaultPublicRoadmapStatuses();
    const suggestions = await db
      .select({
        id: supportRequestsTable.id,
        title: supportRequestsTable.roadmapTitle,
        categoryName: supportRequestsTable.categoryName,
        description: supportRequestsTable.roadmapDescription,
        status: supportRequestsTable.roadmapStatus,
        statusLabel: publicRoadmapStatusesTable.label,
        statusLabelEn: publicRoadmapStatusesTable.labelEn,
        statusOrder: publicRoadmapStatusesTable.sortOrder,
        approvedAt: supportRequestsTable.approvedAt,
      })
      .from(supportRequestsTable)
      .innerJoin(
        publicRoadmapStatusesTable,
        eq(supportRequestsTable.roadmapStatus, publicRoadmapStatusesTable.key),
      )
      .where(
        and(
          eq(supportRequestsTable.requestType, "suggestion"),
          isNotNull(supportRequestsTable.approvedAt),
          isNotNull(supportRequestsTable.roadmapTitle),
          isNotNull(supportRequestsTable.roadmapDescription),
          isNotNull(supportRequestsTable.roadmapStatus),
        ),
      )
      .orderBy(
        asc(publicRoadmapStatusesTable.sortOrder),
        asc(supportRequestsTable.approvedAt),
        asc(supportRequestsTable.id),
      );
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
    await ensureDefaultRequestStatuses("suggestion");
    const withLabels = await attachRequestStatusLabels(requests, "suggestion");
    const withComments = await attachRequestComments(withLabels);
    res.json(ListMySuggestionsResponse.parse(withComments));
  },
);

router.post(
  "/my/suggestions",
  requirePfvlUser,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const rawTitle = (req.body as { title?: unknown } | null)?.title;
    if (typeof rawTitle !== "string" || rawTitle.trim().length < 4) {
      res.status(400).json({ error: "Informe um título com pelo menos 4 caracteres." });
      return;
    }
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
      if (result.error === "status") {
        res.status(503).json({ error: "O status inicial da sugestão não está configurado" });
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
      const updated = await db.transaction(async (tx) => {
        const [renamed] = await tx
          .update(supportRequestCategoriesTable)
          .set(changes)
          .where(
            and(
              eq(supportRequestCategoriesTable.id, params.data.categoryId),
              eq(supportRequestCategoriesTable.subjectId, subject.id),
            ),
          )
          .returning();
        if (renamed && changes.name) {
          await tx
            .update(supportRequestsTable)
            .set({ categoryName: changes.name })
            .where(eq(supportRequestsTable.categoryId, renamed.id));
        }
        return renamed;
      });
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
  "/admin/support-request-statuses",
  requirePfvlUser,
  requireAdmin,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const parsed = ListAdminSupportRequestStatusesQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    await ensureDefaultRequestStatuses(parsed.data.requestType);
    const statuses = await db
      .select()
      .from(supportRequestStatusesTable)
      .where(eq(supportRequestStatusesTable.requestType, parsed.data.requestType))
      .orderBy(asc(supportRequestStatusesTable.sortOrder), asc(supportRequestStatusesTable.id));
    res.json(ListAdminSupportRequestStatusesResponse.parse(statuses));
  },
);

router.post(
  "/admin/support-request-statuses",
  requirePfvlUser,
  requireAdmin,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const parsed = CreateAdminSupportRequestStatusBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const label = parsed.data.label.trim().replace(/\s+/g, " ");
    const labelEn = parsed.data.labelEn.trim().replace(/\s+/g, " ");
    if (label.length < 2 || labelEn.length < 2) {
      res.status(400).json({ error: "Informe o nome do status em português e em inglês." });
      return;
    }
    await ensureDefaultRequestStatuses(parsed.data.requestType);
    const [maxOrder] = await db
      .select({
        value: sql<number>`coalesce(max(${supportRequestStatusesTable.sortOrder}), -10)::int`.mapWith(
          Number,
        ),
      })
      .from(supportRequestStatusesTable)
      .where(eq(supportRequestStatusesTable.requestType, parsed.data.requestType));
    const key = `custom_${randomUUID().replaceAll("-", "").slice(0, 24)}`;
    try {
      const [created] = await db
        .insert(supportRequestStatusesTable)
        .values({
          requestType: parsed.data.requestType,
          key,
          label,
          labelEn,
          active: true,
          isInitial: false,
          sortOrder: (maxOrder?.value ?? -10) + 10,
        })
        .returning();
      res
        .status(201)
        .json(CreateAdminSupportRequestStatusResponse.parse(created));
    } catch (error) {
      if (isUniqueViolation(error)) {
        res.status(409).json({ error: "Já existe um status com esse nome neste fluxo." });
        return;
      }
      throw error;
    }
  },
);

router.patch(
  "/admin/support-request-statuses/order",
  requirePfvlUser,
  requireAdmin,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const parsed = ReorderAdminSupportRequestStatusesBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    await ensureDefaultRequestStatuses(parsed.data.requestType);
    const existing = await db
      .select({ id: supportRequestStatusesTable.id })
      .from(supportRequestStatusesTable)
      .where(eq(supportRequestStatusesTable.requestType, parsed.data.requestType))
      .orderBy(asc(supportRequestStatusesTable.sortOrder), asc(supportRequestStatusesTable.id));
    const requestedIds = new Set(parsed.data.statusIds);
    if (
      requestedIds.size !== existing.length ||
      existing.some((status) => !requestedIds.has(status.id))
    ) {
      res.status(400).json({ error: "A lista deve conter todos os status desse fluxo, sem duplicatas." });
      return;
    }
    const reordered = await db.transaction(async (tx) => {
      for (const [index, id] of parsed.data.statusIds.entries()) {
        await tx
          .update(supportRequestStatusesTable)
          .set({ sortOrder: index * 10, updatedAt: new Date() })
          .where(
            and(
              eq(supportRequestStatusesTable.id, id),
              eq(supportRequestStatusesTable.requestType, parsed.data.requestType),
            ),
          );
      }
      return tx
        .select()
        .from(supportRequestStatusesTable)
        .where(eq(supportRequestStatusesTable.requestType, parsed.data.requestType))
        .orderBy(asc(supportRequestStatusesTable.sortOrder), asc(supportRequestStatusesTable.id));
    });
    res.json(ReorderAdminSupportRequestStatusesResponse.parse(reordered));
  },
);

router.patch(
  "/admin/support-request-statuses/:statusId",
  requirePfvlUser,
  requireAdmin,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const params = UpdateAdminSupportRequestStatusParams.safeParse(req.params);
    const parsed = UpdateAdminSupportRequestStatusBody.safeParse(req.body);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [existing] = await db
      .select()
      .from(supportRequestStatusesTable)
      .where(eq(supportRequestStatusesTable.id, params.data.statusId))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "Status não encontrado." });
      return;
    }
    if (existing.isInitial && parsed.data.active === false) {
      res.status(400).json({ error: "O status inicial não pode ser desativado." });
      return;
    }
    const changes: Partial<typeof supportRequestStatusesTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (parsed.data.label !== undefined) {
      const label = parsed.data.label.trim().replace(/\s+/g, " ");
      if (label.length < 2) {
        res.status(400).json({ error: "O nome em português precisa ter pelo menos 2 caracteres." });
        return;
      }
      changes.label = label;
    }
    if (parsed.data.labelEn !== undefined) {
      const labelEn = parsed.data.labelEn.trim().replace(/\s+/g, " ");
      if (labelEn.length < 2) {
        res.status(400).json({ error: "O nome em inglês precisa ter pelo menos 2 caracteres." });
        return;
      }
      changes.labelEn = labelEn;
    }
    if (parsed.data.active !== undefined) changes.active = parsed.data.active;
    try {
      const [updated] = await db
        .update(supportRequestStatusesTable)
        .set(changes)
        .where(eq(supportRequestStatusesTable.id, params.data.statusId))
        .returning();
      if (!updated) {
        res.status(404).json({ error: "Status não encontrado." });
        return;
      }
      res.json(UpdateAdminSupportRequestStatusResponse.parse(updated));
    } catch (error) {
      if (isUniqueViolation(error)) {
        res.status(409).json({ error: "Já existe um status com esse nome neste fluxo." });
        return;
      }
      throw error;
    }
  },
);

router.get(
  "/admin/public-roadmap-statuses",
  requirePfvlUser,
  requireAdmin,
  async (_req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    await ensureDefaultPublicRoadmapStatuses();
    const statuses = await db
      .select()
      .from(publicRoadmapStatusesTable)
      .orderBy(
        asc(publicRoadmapStatusesTable.sortOrder),
        asc(publicRoadmapStatusesTable.id),
      );
    res.json(ListAdminPublicRoadmapStatusesResponse.parse(statuses));
  },
);

router.post(
  "/admin/public-roadmap-statuses",
  requirePfvlUser,
  requireAdmin,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const parsed = CreateAdminPublicRoadmapStatusBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const label = parsed.data.label.trim().replace(/\s+/g, " ");
    const labelEn = parsed.data.labelEn.trim().replace(/\s+/g, " ");
    if (label.length < 2 || labelEn.length < 2) {
      res.status(400).json({ error: "Informe o nome do estágio em português e em inglês." });
      return;
    }
    await ensureDefaultPublicRoadmapStatuses();
    const [maxOrder] = await db
      .select({
        value: sql<number>`coalesce(max(${publicRoadmapStatusesTable.sortOrder}), -10)::int`.mapWith(
          Number,
        ),
      })
      .from(publicRoadmapStatusesTable);
    const key = `custom_${randomUUID().replaceAll("-", "").slice(0, 24)}`;
    try {
      const [created] = await db
        .insert(publicRoadmapStatusesTable)
        .values({
          key,
          label,
          labelEn,
          active: true,
          sortOrder: (maxOrder?.value ?? -10) + 10,
        })
        .returning();
      res
        .status(201)
        .json(CreateAdminPublicRoadmapStatusResponse.parse(created));
    } catch (error) {
      if (isUniqueViolation(error)) {
        res.status(409).json({ error: "Já existe um estágio público com esse nome." });
        return;
      }
      throw error;
    }
  },
);

router.patch(
  "/admin/public-roadmap-statuses/order",
  requirePfvlUser,
  requireAdmin,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const parsed = ReorderAdminPublicRoadmapStatusesBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    await ensureDefaultPublicRoadmapStatuses();
    const existing = await db
      .select({ id: publicRoadmapStatusesTable.id })
      .from(publicRoadmapStatusesTable)
      .orderBy(
        asc(publicRoadmapStatusesTable.sortOrder),
        asc(publicRoadmapStatusesTable.id),
      );
    const requestedIds = new Set(parsed.data.statusIds);
    if (
      requestedIds.size !== existing.length ||
      existing.some((status) => !requestedIds.has(status.id))
    ) {
      res.status(400).json({ error: "A lista deve conter todos os estágios públicos, sem duplicatas." });
      return;
    }
    const reordered = await db.transaction(async (tx) => {
      for (const [index, id] of parsed.data.statusIds.entries()) {
        await tx
          .update(publicRoadmapStatusesTable)
          .set({ sortOrder: index * 10, updatedAt: new Date() })
          .where(eq(publicRoadmapStatusesTable.id, id));
      }
      return tx
        .select()
        .from(publicRoadmapStatusesTable)
        .orderBy(
          asc(publicRoadmapStatusesTable.sortOrder),
          asc(publicRoadmapStatusesTable.id),
        );
    });
    res.json(ReorderAdminPublicRoadmapStatusesResponse.parse(reordered));
  },
);

router.patch(
  "/admin/public-roadmap-statuses/:statusId",
  requirePfvlUser,
  requireAdmin,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const params = UpdateAdminPublicRoadmapStatusParams.safeParse(req.params);
    const parsed = UpdateAdminPublicRoadmapStatusBody.safeParse(req.body);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    await ensureDefaultPublicRoadmapStatuses();
    const [existing] = await db
      .select({ id: publicRoadmapStatusesTable.id })
      .from(publicRoadmapStatusesTable)
      .where(eq(publicRoadmapStatusesTable.id, params.data.statusId))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "Estágio público não encontrado." });
      return;
    }
    const changes: Partial<typeof publicRoadmapStatusesTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (parsed.data.label !== undefined) {
      const label = parsed.data.label.trim().replace(/\s+/g, " ");
      if (label.length < 2) {
        res.status(400).json({ error: "O nome em português precisa ter pelo menos 2 caracteres." });
        return;
      }
      changes.label = label;
    }
    if (parsed.data.labelEn !== undefined) {
      const labelEn = parsed.data.labelEn.trim().replace(/\s+/g, " ");
      if (labelEn.length < 2) {
        res.status(400).json({ error: "O nome em inglês precisa ter pelo menos 2 caracteres." });
        return;
      }
      changes.labelEn = labelEn;
    }
    if (parsed.data.active !== undefined) changes.active = parsed.data.active;
    try {
      const [updated] = await db
        .update(publicRoadmapStatusesTable)
        .set(changes)
        .where(eq(publicRoadmapStatusesTable.id, params.data.statusId))
        .returning();
      if (!updated) {
        res.status(404).json({ error: "Estágio público não encontrado." });
        return;
      }
      res.json(UpdateAdminPublicRoadmapStatusResponse.parse(updated));
    } catch (error) {
      if (isUniqueViolation(error)) {
        res.status(409).json({ error: "Já existe um estágio público com esse nome." });
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
    await ensureDefaultRequestStatuses();
    const requests = await db
      .select({
        id: supportRequestsTable.id,
        protocol: supportRequestsTable.protocol,
        requestType: supportRequestsTable.requestType,
        subjectName: supportRequestsTable.subjectName,
        title: supportRequestsTable.title,
        roadmapTitle: supportRequestsTable.roadmapTitle,
        roadmapDescription: supportRequestsTable.roadmapDescription,
        roadmapStatus: supportRequestsTable.roadmapStatus,
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
      .orderBy(desc(supportRequestsTable.createdAt), desc(supportRequestsTable.id));
    const withLabels = await attachRequestStatusLabels(requests);
    const requestsWithComments = await attachRequestComments(withLabels);
    res.json(
      ListAdminSupportRequestsResponse.parse({
        requests: requestsWithComments,
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
    await ensureDefaultRequestStatuses();
    const result = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({
          id: supportRequestsTable.id,
          protocol: supportRequestsTable.protocol,
          requestType: supportRequestsTable.requestType,
          subjectName: supportRequestsTable.subjectName,
          title: supportRequestsTable.title,
          requesterUserId: supportRequestsTable.requesterUserId,
          status: supportRequestsTable.status,
        })
        .from(supportRequestsTable)
        .where(eq(supportRequestsTable.id, params.data.requestId))
        .limit(1);
      if (!existing) return { kind: "not_found" as const };
      const [nextStatus] = await tx
        .select({
          id: supportRequestStatusesTable.id,
          key: supportRequestStatusesTable.key,
        })
        .from(supportRequestStatusesTable)
        .where(
          and(
            eq(supportRequestStatusesTable.requestType, existing.requestType),
            eq(supportRequestStatusesTable.key, parsed.data.status),
            eq(supportRequestStatusesTable.active, true),
          ),
        )
        .limit(1);
      if (!nextStatus) return { kind: "invalid_status" as const };
      const [updated] = await tx
        .update(supportRequestsTable)
        .set({
          status: nextStatus.key,
          statusId: nextStatus.id,
          updatedAt: new Date(),
        })
        .where(eq(supportRequestsTable.id, params.data.requestId))
        .returning({
          id: supportRequestsTable.id,
          protocol: supportRequestsTable.protocol,
          requestType: supportRequestsTable.requestType,
          subjectName: supportRequestsTable.subjectName,
          title: supportRequestsTable.title,
          roadmapTitle: supportRequestsTable.roadmapTitle,
          roadmapDescription: supportRequestsTable.roadmapDescription,
          roadmapStatus: supportRequestsTable.roadmapStatus,
          categoryName: supportRequestsTable.categoryName,
          approvedAt: supportRequestsTable.approvedAt,
          requesterName: supportRequestsTable.requesterName,
          requesterEmail: supportRequestsTable.requesterEmail,
          message: supportRequestsTable.message,
          status: supportRequestsTable.status,
          createdAt: supportRequestsTable.createdAt,
          updatedAt: supportRequestsTable.updatedAt,
        });
      if (existing.requesterUserId !== null && existing.status !== parsed.data.status) {
        const isSupportRequest = existing.requestType === "support";
        await tx
          .insert(notificationsTable)
          .values({
            recipientUserId: existing.requesterUserId,
            actorUserId: getPfvlUser(req).id,
            eventKey: `${isSupportRequest ? "support-request" : "suggestion-request"}:${existing.id}:status:${randomUUID()}`,
            type: "suggestion_status",
            statusId: nextStatus.id,
            title: isSupportRequest
              ? "O status da sua solicitação foi atualizado"
              : "Sua sugestão foi atualizada",
            message: isSupportRequest
              ? `Protocolo ${existing.protocol}: ${existing.subjectName}`
              : `${existing.title ?? existing.subjectName}`,
            href: isSupportRequest
              ? `/help/requests#support-request-${existing.id}`
              : `/suggestions#suggestion-${existing.id}`,
          })
          .onConflictDoNothing();
      }
      return updated
        ? { kind: "updated" as const, request: updated }
        : { kind: "not_found" as const };
    });
    if (result.kind === "not_found") {
      res.status(404).json({ error: "Solicitação não encontrada" });
      return;
    }
    if (result.kind === "invalid_status") {
      res.status(400).json({ error: "Escolha um status ativo deste fluxo." });
      return;
    }
    const withLabels = await attachRequestStatusLabels([result.request]);
    const withComments = await attachRequestComments(withLabels);
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

    await ensureDefaultPublicRoadmapStatuses();
    const admin = getPfvlUser(req);
    const result = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({
          id: supportRequestsTable.id,
          protocol: supportRequestsTable.protocol,
          requestType: supportRequestsTable.requestType,
          title: supportRequestsTable.title,
          roadmapTitle: supportRequestsTable.roadmapTitle,
          roadmapDescription: supportRequestsTable.roadmapDescription,
          roadmapStatus: supportRequestsTable.roadmapStatus,
          requesterUserId: supportRequestsTable.requesterUserId,
          approvedAt: supportRequestsTable.approvedAt,
        })
        .from(supportRequestsTable)
        .where(eq(supportRequestsTable.id, params.data.requestId))
        .limit(1);
      if (!existing || existing.requestType !== "suggestion") return null;

      const wasApproved = existing.approvedAt !== null;
      const roadmapTitle = parsed.data.roadmapTitle?.trim() ?? existing.roadmapTitle;
      const roadmapDescription =
        parsed.data.roadmapDescription?.trim() ?? existing.roadmapDescription;
      const roadmapStatus = parsed.data.roadmapStatus ?? existing.roadmapStatus;
      const isApproved = parsed.data.approved ?? wasApproved;
      if (
        parsed.data.roadmapStatus !== undefined &&
        parsed.data.roadmapStatus !== existing.roadmapStatus
      ) {
        const [activeStatus] = await tx
          .select({ key: publicRoadmapStatusesTable.key })
          .from(publicRoadmapStatusesTable)
          .where(
            and(
              eq(publicRoadmapStatusesTable.key, parsed.data.roadmapStatus),
              eq(publicRoadmapStatusesTable.active, true),
            ),
          )
          .limit(1);
        if (!activeStatus) return { kind: "invalid_public_status" as const };
      }
      if (
        isApproved &&
        (!roadmapTitle || !roadmapDescription || !roadmapStatus)
      ) {
        return {
          kind: !roadmapStatus
            ? "missing_public_status" as const
            : "missing_public_copy" as const,
        };
      }
      if (
        parsed.data.roadmapTitle !== undefined &&
        (roadmapTitle?.length ?? 0) < 4
      ) {
        return { kind: "invalid_title" as const };
      }
      if (
        parsed.data.roadmapDescription !== undefined &&
        (roadmapDescription?.length ?? 0) < 10
      ) {
        return { kind: "invalid_description" as const };
      }

      const approvedAt = isApproved
        ? existing.approvedAt ?? new Date()
        : null;
      const [updated] = await tx
        .update(supportRequestsTable)
        .set({
          roadmapTitle,
          roadmapDescription,
          roadmapStatus,
          approvedAt,
          updatedAt: new Date(),
        })
        .where(eq(supportRequestsTable.id, existing.id))
        .returning({
          id: supportRequestsTable.id,
          approvedAt: supportRequestsTable.approvedAt,
          roadmapTitle: supportRequestsTable.roadmapTitle,
          roadmapDescription: supportRequestsTable.roadmapDescription,
          roadmapStatus: supportRequestsTable.roadmapStatus,
        });

      if (existing.requesterUserId !== null && wasApproved !== isApproved) {
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
            href: `/suggestions#suggestion-${existing.id}`,
          })
          .onConflictDoNothing();
      }
      return updated ? { kind: "updated" as const, result: updated } : null;
    });

    if (!result) {
      res.status(404).json({ error: "Sugestão não encontrada" });
      return;
    }
    if (result.kind === "invalid_public_status") {
      res.status(400).json({ error: "Escolha um estágio público ativo." });
      return;
    }
    if (result.kind === "missing_public_copy") {
      res.status(400).json({ error: "Preencha o título e a descrição pública antes de publicar." });
      return;
    }
    if (result.kind === "missing_public_status") {
      res.status(400).json({ error: "Escolha e salve um estágio público antes de publicar." });
      return;
    }
    if (result.kind === "invalid_title") {
      res.status(400).json({ error: "O título público deve ter pelo menos 4 caracteres." });
      return;
    }
    if (result.kind === "invalid_description") {
      res.status(400).json({ error: "A descrição pública deve ter pelo menos 10 caracteres." });
      return;
    }
    res.json(UpdateAdminSupportRequestRoadmapResponse.parse(result.result));
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
          protocol: supportRequestsTable.protocol,
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
      if (requestDetails.requesterUserId !== null) {
        const isSupportRequest = requestDetails.requestType === "support";
        await tx
          .insert(notificationsTable)
          .values({
            recipientUserId: requestDetails.requesterUserId,
            actorUserId: admin.id,
            eventKey: `${isSupportRequest ? "support-request" : "suggestion-request"}:${requestDetails.id}:comment:${randomUUID()}`,
            type: "comment_reply",
            title: isSupportRequest
              ? "A equipe respondeu à sua solicitação"
              : "A equipe respondeu à sua sugestão",
            message: isSupportRequest
              ? `Protocolo ${requestDetails.protocol}: ${requestDetails.subjectName}`
              : requestDetails.title ?? requestDetails.subjectName,
            href: isSupportRequest
              ? `/help/requests#support-request-${requestDetails.id}`
              : `/suggestions#suggestion-${requestDetails.id}`,
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
