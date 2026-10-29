import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getAuth } from "@clerk/express";
import { Router } from "express";
import {
  CloseAdminPollParams,
  CloseAdminPollResponse,
  CreateCommentBody,
  CreateCommentResponse,
  CreateImageUploadBody,
  CreateImageUploadResponse,
  CreatePostBody,
  CreatePostResponse,
  CreateAdminTaxonomyBody,
  CreateAdminTaxonomyResponse,
  CreateSuggestionBody,
  CreateSuggestionResponse,
  CreateAdminPollBody,
  CreateAdminPollResponse,
  DeleteNotificationParams,
  DeleteNotificationResponse,
  DeleteCommentParams,
  DeletePostParams,
  DeleteAdminTaxonomyParams,
  DeleteAdminTaxonomyResponse,
  UpdateAdminTaxonomyBody,
  UpdateAdminTaxonomyParams,
  UpdateAdminTaxonomyResponse,
  UpdateAdminSiteMediaBody,
  UpdateAdminSiteMediaParams,
  UpdateAdminSiteMediaResponse,
  GetActivePollResponse,
  GetDashboardResponse,
  GetCurrentUserResponse,
  ListNotificationsResponse,
  GetPostParams,
  GetPostResponse,
  GetSiteMediaFileHeader,
  GetSiteMediaFileParams,
  GetSiteMediaResponse,
  Indicator,
  ListAdminPostsResponse,
  ListAdminPollsResponse,
  ListAdminSiteMediaResponse,
  ListAdminUsersResponse,
  ListAdminTaxonomyResponse,
  ListCommentsParams,
  ListCommentsResponse,
  ListIndicatorsResponse,
  ListPostsQueryParams,
  ListPostsResponse,
  ListTaxonomyQueryParams,
  ListTaxonomyResponse,
  ListSuggestionsResponse,
  MarkNotificationReadParams,
  MarkNotificationReadResponse,
  type NotificationType,
  UpdateAdminSuggestionBody,
  UpdateAdminSuggestionParams,
  UpdateAdminSuggestionResponse,
  UpdateAdminUserBody,
  UpdateAdminUserParams,
  UpdateAdminUserResponse,
  UpdatePostBody,
  UpdatePostParams,
  UpdatePostResponse,
  VotePollBody,
  VotePollParams,
  VotePollResponse,
} from "@workspace/api-zod";
import {
  and,
  commentsTable,
  desc,
  db,
  eq,
  ilike,
  inArray,
  notificationsTable,
  or,
  postsTable,
  pollVotesTable,
  pollsTable,
  sql,
  siteMediaTable,
  suggestionsTable,
  taxonomyTable,
  usersTable,
} from "@workspace/db";
import { logger } from "../lib/logger.js";
import type {
  PfvlRequest as ExpressRequest,
  PfvlResponse as ExpressResponse,
} from "../lib/route-types.js";
import {
  getPfvlUser,
  requireAdmin,
  requirePfvlUser,
} from "../lib/pfvl-auth.js";

const router = Router();

type PublicPostRow = Omit<typeof postsTable.$inferSelect, "authorUserId">;
type PublicCommentRow = Omit<
  typeof commentsTable.$inferSelect,
  "authorUserId"
>;
type PollRow = typeof pollsTable.$inferSelect;
type NotificationInsert = typeof notificationsTable.$inferInsert;
type SiteMediaRow = typeof siteMediaTable.$inferSelect;

const siteMediaSlots = ["home_image", "presentation_video"] as const;
const defaultSiteMediaExtensions = {
  home_image: "jpg",
  presentation_video: "mp4",
} as const;
const siteMediaFolders = {
  home_image: "imagemprincipal",
  presentation_video: "videop",
} as const;
const siteMediaTypes: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
  webm: "video/webm",
};

type NotificationEvent = {
  eventKey: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string;
  actorUserId: number | null;
};

const publicPostColumns = {
  id: postsTable.id,
  title: postsTable.title,
  excerpt: postsTable.excerpt,
  body: postsTable.body,
  kind: postsTable.kind,
  category: postsTable.category,
  tags: postsTable.tags,
  authorName: postsTable.authorName,
  coverImageUrl: postsTable.coverImageUrl,
  videoUrl: postsTable.videoUrl,
  status: postsTable.status,
  commentCount: postsTable.commentCount,
  createdAt: postsTable.createdAt,
  updatedAt: postsTable.updatedAt,
};

const publicCommentColumns = {
  id: commentsTable.id,
  postId: commentsTable.postId,
  parentCommentId: sql<number | null>`NULLIF(to_jsonb(${commentsTable})->>'parent_comment_id', '')::integer`,
  authorName: commentsTable.authorName,
  body: commentsTable.body,
  status: sql<string>`COALESCE(to_jsonb(${commentsTable})->>'status', 'published')`,
  createdAt: commentsTable.createdAt,
};

function notificationRows(
  recipientUserIds: number[],
  event: NotificationEvent,
  excludeActor = true,
): NotificationInsert[] {
  return [...new Set(recipientUserIds)]
    .filter((recipientUserId) => !excludeActor || recipientUserId !== event.actorUserId)
    .map((recipientUserId) => ({
      recipientUserId,
      actorUserId: event.actorUserId,
      eventKey: event.eventKey,
      type: event.type,
      title: event.title,
      message: event.message,
      href: event.href,
    }));
}

async function activeNotificationRecipients(): Promise<number[]> {
  const users = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.status, "active"));
  return users.map((user) => user.id);
}

function postHref(kind: string, postId: number): string {
  if (kind === "blog") return `/blog/${postId}`;
  if (kind === "news") return `/news/${postId}`;
  if (kind === "help") return `/help/${postId}`;
  return `/community/${postId}`;
}

function postNotification(
  post: Pick<typeof postsTable.$inferSelect, "id" | "kind" | "title" | "excerpt">,
  actorUserId: number,
): NotificationEvent {
  const isUpdate = post.kind === "news";
  return {
    eventKey: `published-post:${post.id}`,
    type: isUpdate ? "new_update" : "new_publication",
    title: isUpdate ? "Nova novidade no PFVL" : "Nova publicação no PFVL",
    message: post.title || post.excerpt,
    href: postHref(post.kind, post.id),
    actorUserId,
  };
}

async function persistNotificationBatch(
  rows: NotificationInsert[],
  persist: (batch: NotificationInsert[]) => Promise<void>,
): Promise<void> {
  if (rows.length) await persist(rows);
}

function postResponse(post: PublicPostRow) {
  const storedCoverImageUrl = post.coverImageUrl ?? null;
  let coverImageUrl = storedCoverImageUrl;
  if (storedCoverImageUrl) {
    try {
      const imageUrl = new URL(storedCoverImageUrl);
      const match = imageUrl.pathname.match(
        /^\/posts\/(\d+)\/([0-9a-f-]+\.(?:jpg|png|webp))$/i,
      );
      if (
        imageUrl.hostname.endsWith(".r2.cloudflarestorage.com") &&
        match
      ) {
        coverImageUrl = `/api/uploads/${match[1]}/${match[2]}`;
      }
    } catch {
      // Preserve non-absolute URLs; safeCoverUrl validates edits and creation.
    }
  }
  return {
    ...post,
    coverImageUrl,
    videoUrl: post.videoUrl ?? null,
    tags: post.tags ?? [],
  };
}

async function optionalPfvlUserId(req: ExpressRequest): Promise<number | null> {
  try {
    const clerkUserId = getAuth(
      req as unknown as Parameters<typeof getAuth>[0],
    ).userId;
    if (!clerkUserId) return null;
    const [user] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, clerkUserId))
      .limit(1);
    return user?.id ?? null;
  } catch {
    return null;
  }
}

async function pollSummaries(
  polls: PollRow[],
  viewerUserId: number | null = null,
) {
  if (!polls.length) return [];

  const pollIds = polls.map((poll) => poll.id);
  const [counts, viewerVotes] = await Promise.all([
    db
      .select({
        pollId: pollVotesTable.pollId,
        likeCount:
          sql<number>`count(*) FILTER (WHERE ${pollVotesTable.vote} = 'like')`.mapWith(
            Number,
          ),
        dislikeCount:
          sql<number>`count(*) FILTER (WHERE ${pollVotesTable.vote} = 'dislike')`.mapWith(
            Number,
          ),
      })
      .from(pollVotesTable)
      .where(inArray(pollVotesTable.pollId, pollIds))
      .groupBy(pollVotesTable.pollId),
    viewerUserId === null
      ? Promise.resolve([])
      : db
          .select({
            pollId: pollVotesTable.pollId,
            vote: pollVotesTable.vote,
          })
          .from(pollVotesTable)
          .where(
            and(
              inArray(pollVotesTable.pollId, pollIds),
              eq(pollVotesTable.userId, viewerUserId),
            ),
          ),
  ]);
  const countsByPollId = new Map(counts.map((row) => [row.pollId, row]));
  const votesByPollId = new Map(
    viewerVotes.map((row) => [row.pollId, row.vote]),
  );

  return polls.map((poll) => {
    const countsForPoll = countsByPollId.get(poll.id);
    const viewerVote = votesByPollId.get(poll.id);
    return {
      ...poll,
      likeCount: countsForPoll?.likeCount ?? 0,
      dislikeCount: countsForPoll?.dislikeCount ?? 0,
      userVote:
        viewerVote === "like" || viewerVote === "dislike" ? viewerVote : null,
    };
  });
}

function safeCoverUrl(value: string | null | undefined): boolean {
  if (!value) return true;
  if (value.startsWith("/") && !value.startsWith("//")) {
    return !value.split("/").includes("..");
  }
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

async function hasValidTaxonomySelection(
  kind: string,
  category: string,
  tags: string[],
): Promise<boolean> {
  const rows = await db
    .select({ type: taxonomyTable.type, name: taxonomyTable.name })
    .from(taxonomyTable)
    .where(eq(taxonomyTable.kind, kind));
  const normalizedCategory = category.trim().toLocaleLowerCase("pt-BR");
  const categories = new Set(
    rows
      .filter((row) => row.type === "category")
      .map((row) => row.name.toLocaleLowerCase("pt-BR")),
  );
  const allowedTags = new Set(
    rows
      .filter((row) => row.type === "tag")
      .map((row) => row.name.toLocaleLowerCase("pt-BR")),
  );
  return (
    categories.has(normalizedCategory) &&
    tags.every((tag) => allowedTags.has(tag.trim().toLocaleLowerCase("pt-BR")))
  );
}

router.get("/dashboard", async (_req: ExpressRequest, res: ExpressResponse): Promise<void> => {
  const [posts, suggestions] = await Promise.all([
    db
      .select(publicPostColumns)
      .from(postsTable)
      .where(eq(postsTable.status, "published"))
      .orderBy(desc(postsTable.createdAt)),
    db.select().from(suggestionsTable).orderBy(desc(suggestionsTable.createdAt)),
  ]);

  const response = {
    publishedPosts: posts.length,
    forumTopics: posts.filter((post) => post.kind === "forum").length,
    openSuggestions: suggestions.filter(
      (suggestion) => suggestion.status !== "completed",
    ).length,
    recentPosts: posts.slice(0, 5).map(postResponse),
    recentSuggestions: suggestions.slice(0, 4),
  };

  res.json(GetDashboardResponse.parse(response));
});

router.get("/site-media", async (_req: ExpressRequest, res: ExpressResponse): Promise<void> => {
  const rows = await db.select().from(siteMediaTable);
  const bySlot = new Map(rows.map((row) => [row.slot, row]));
  const publicUrl = (slot: (typeof siteMediaSlots)[number]) => {
    const media = bySlot.get(slot);
    if (!media?.name) return null;
    return `/api/site-media/files/${slot}?v=${media.updatedAt.getTime()}`;
  };

  res.json(
    GetSiteMediaResponse.parse({
      homeImageUrl: publicUrl("home_image"),
      presentationVideoUrl: publicUrl("presentation_video"),
    }),
  );
});

router.get("/posts", async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
  const parsed = ListPostsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const conditions = [eq(postsTable.status, "published")];
  if (parsed.data.kind) {
    conditions.push(eq(postsTable.kind, parsed.data.kind));
  }
  if (parsed.data.search?.trim()) {
    const searchTerm = `%${parsed.data.search.trim()}%`;
    conditions.push(
      or(
        ilike(postsTable.title, searchTerm),
        ilike(postsTable.excerpt, searchTerm),
        ilike(postsTable.body, searchTerm),
        ilike(postsTable.category, searchTerm),
      )!,
    );
  }

  const rows = await db
    .select(publicPostColumns)
    .from(postsTable)
    .where(and(...conditions))
    .orderBy(desc(postsTable.createdAt));
  const response = rows.map(postResponse);

  res.json(ListPostsResponse.parse(response));
});

router.get(
  "/taxonomy",
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const parsed = ListTaxonomyQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const rows = await db
      .select()
      .from(taxonomyTable)
      .where(eq(taxonomyTable.kind, parsed.data.kind))
      .orderBy(taxonomyTable.type, taxonomyTable.name);
    res.json(ListTaxonomyResponse.parse(rows));
  },
);

router.get("/posts/:postId", async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
  const params = GetPostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [post] = await db
    .select(publicPostColumns)
    .from(postsTable)
    .where(
      and(
        eq(postsTable.id, params.data.postId),
        eq(postsTable.status, "published"),
      ),
    );
  if (!post) {
    res.status(404).json({ error: "Publicação não encontrada" });
    return;
  }

  res.json(
    GetPostResponse.parse({
      ...postResponse(post),
    }),
  );
});

router.get(
  "/posts/:postId/comments",
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const params = ListCommentsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [post] = await db
      .select({ id: postsTable.id })
      .from(postsTable)
      .where(
        and(
          eq(postsTable.id, params.data.postId),
          eq(postsTable.status, "published"),
        ),
      );
    if (!post) {
      res.status(404).json({ error: "Publicação não encontrada" });
      return;
    }

    const rows = await db
      .select(publicCommentColumns)
      .from(commentsTable)
      .where(
        and(
          eq(commentsTable.postId, params.data.postId),
          sql`COALESCE(to_jsonb(${commentsTable})->>'status', 'published') = 'published'`,
        ),
      )
      .orderBy(commentsTable.createdAt);
    const comments: PublicCommentRow[] = rows.map((comment) => ({
      ...comment,
      parentCommentId: comment.parentCommentId ?? null,
    }));

    res.json(ListCommentsResponse.parse(comments));
  },
);

router.get("/polls/active", async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
  const [poll] = await db
    .select()
    .from(pollsTable)
    .where(eq(pollsTable.status, "active"))
    .orderBy(desc(pollsTable.createdAt))
    .limit(1);
  const userId = await optionalPfvlUserId(req);
  const [summary] = await pollSummaries(poll ? [poll] : [], userId);
  res.json(GetActivePollResponse.parse({ poll: summary ?? null }));
});

router.get("/me", requirePfvlUser, (req: ExpressRequest, res: ExpressResponse): void => {
  res.json(GetCurrentUserResponse.parse(getPfvlUser(req)));
});

router.get(
  "/notifications",
  requirePfvlUser,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const user = getPfvlUser(req);
    const [notifications, unreadRows] = await Promise.all([
      db
        .select({
          id: notificationsTable.id,
          type: notificationsTable.type,
          title: notificationsTable.title,
          message: notificationsTable.message,
          href: notificationsTable.href,
          isRead: notificationsTable.isRead,
          createdAt: notificationsTable.createdAt,
        })
        .from(notificationsTable)
        .where(eq(notificationsTable.recipientUserId, user.id))
        .orderBy(desc(notificationsTable.createdAt))
        .limit(100),
      db
        .select({
          count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(notificationsTable)
        .where(
          and(
            eq(notificationsTable.recipientUserId, user.id),
            eq(notificationsTable.isRead, false),
          ),
        ),
    ]);

    res.json(
      ListNotificationsResponse.parse({
        notifications,
        unreadCount: unreadRows[0]?.count ?? 0,
      }),
    );
  },
);

router.patch(
  "/notifications/:notificationId/read",
  requirePfvlUser,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const params = MarkNotificationReadParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const user = getPfvlUser(req);
    const [updated] = await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(
        and(
          eq(notificationsTable.id, params.data.notificationId),
          eq(notificationsTable.recipientUserId, user.id),
        ),
      )
      .returning({
        id: notificationsTable.id,
        type: notificationsTable.type,
        title: notificationsTable.title,
        message: notificationsTable.message,
        href: notificationsTable.href,
        isRead: notificationsTable.isRead,
        createdAt: notificationsTable.createdAt,
      });

    if (!updated) {
      res.status(404).json({ error: "Notificação não encontrada" });
      return;
    }
    res.json(MarkNotificationReadResponse.parse(updated));
  },
);

router.delete(
  "/notifications/:notificationId",
  requirePfvlUser,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const params = DeleteNotificationParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const user = getPfvlUser(req);
    const [deleted] = await db
      .delete(notificationsTable)
      .where(
        and(
          eq(notificationsTable.id, params.data.notificationId),
          eq(notificationsTable.recipientUserId, user.id),
        ),
      )
      .returning({ id: notificationsTable.id });
    if (!deleted) {
      res.status(404).json({ error: "Notificação não encontrada" });
      return;
    }
    DeleteNotificationResponse.parse(undefined);
    res.status(204).end();
  },
);

router.post("/posts", requirePfvlUser, async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
  const parsed = CreatePostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const user = getPfvlUser(req);
  const input = parsed.data;
  if (user.role !== "admin" && input.kind !== "forum") {
    res.status(403).json({ error: "Membros podem criar tópicos na comunidade" });
    return;
  }
  const category = input.category.trim();
  const tags = [...new Set((input.tags ?? []).map((tag) => tag.trim()))];
  if (!(await hasValidTaxonomySelection(input.kind, category, tags))) {
    res.status(400).json({ error: "Selecione uma categoria e marcadores cadastrados pelo administrador." });
    return;
  }
  if (
    (input.kind === "blog" || input.kind === "forum") &&
    !input.coverImageUrl
  ) {
    res.status(400).json({ error: "Adicione uma imagem à publicação" });
    return;
  }
  if (!safeCoverUrl(input.coverImageUrl)) {
    res.status(400).json({ error: "Use uma imagem HTTPS válida" });
    return;
  }

  const status = user.role === "admin" ? (input.status ?? "published") : "published";
  const recipients =
    status === "published" ? await activeNotificationRecipients() : [];
  const created = await db.transaction(async (tx) => {
    const [post] = await tx
      .insert(postsTable)
      .values({
        title: input.title.trim(),
        excerpt: input.excerpt?.trim() || input.body.trim().slice(0, 220),
        body: input.body.trim(),
        kind: input.kind,
        category,
        tags,
        authorName: user.displayName,
        authorUserId: user.id,
        coverImageUrl: input.coverImageUrl ?? null,
        videoUrl: input.videoUrl ?? null,
        status,
      })
      .returning();

    if (post.status === "published") {
      const event = postNotification(post, user.id);
      await persistNotificationBatch(
        notificationRows(recipients, event),
        async (batch) => {
          await tx.insert(notificationsTable).values(batch).onConflictDoNothing();
        },
      );
    }
    return post;
  });

  res.status(201).json(CreatePostResponse.parse(postResponse(created)));
});

router.patch(
  "/posts/:postId",
  requirePfvlUser,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const params = UpdatePostParams.safeParse(req.params);
    const parsed = UpdatePostBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({
        error: !params.success
          ? params.error.message
          : parsed.error?.message ?? "Dados inválidos",
      });
      return;
    }

    const user = getPfvlUser(req);
    const [post] = await db
      .select()
      .from(postsTable)
      .where(eq(postsTable.id, params.data.postId))
      .limit(1);
    if (!post) {
      res.status(404).json({ error: "Publicação não encontrada" });
      return;
    }
    const ownsForumPost =
      post.kind === "forum" && post.authorUserId === user.id;
    if (user.role !== "admin" && !ownsForumPost) {
      res.status(403).json({ error: "Você não pode editar esta publicação" });
      return;
    }
    if (user.role !== "admin" && parsed.data.status !== undefined) {
      res.status(403).json({ error: "Somente administradores alteram a publicação" });
      return;
    }
    const category = parsed.data.category?.trim() ?? post.category;
    const tags = parsed.data.tags ?? post.tags ?? [];
    if (!(await hasValidTaxonomySelection(post.kind, category, tags))) {
      res.status(400).json({ error: "Selecione uma categoria e marcadores cadastrados pelo administrador." });
      return;
    }

    const coverImageUrl =
      parsed.data.coverImageUrl === undefined
        ? post.coverImageUrl
        : parsed.data.coverImageUrl;
    if (!safeCoverUrl(coverImageUrl)) {
      res.status(400).json({ error: "Use uma imagem HTTPS válida" });
      return;
    }
    if (
      (post.kind === "blog" || post.kind === "forum") &&
      !coverImageUrl
    ) {
      res.status(400).json({ error: "Adicione uma imagem à publicação" });
      return;
    }

    const willPublish =
      post.status !== "published" &&
      (parsed.data.status ?? post.status) === "published";
    const recipients = willPublish ? await activeNotificationRecipients() : [];
    const updated = await db.transaction(async (tx) => {
      const [updatedPost] = await tx
        .update(postsTable)
        .set({
          ...parsed.data,
          title: parsed.data.title?.trim(),
          excerpt: parsed.data.excerpt?.trim(),
          body: parsed.data.body?.trim(),
          category,
          tags,
          authorUserId: post.authorUserId,
          updatedAt: new Date(),
        })
        .where(eq(postsTable.id, post.id))
        .returning();

      if (willPublish && updatedPost.status === "published") {
        const event = postNotification(updatedPost, user.id);
        await persistNotificationBatch(
          notificationRows(recipients, event),
          async (batch) => {
            await tx.insert(notificationsTable).values(batch).onConflictDoNothing();
          },
        );
      }
      return updatedPost;
    });

    res.json(UpdatePostResponse.parse(postResponse(updated)));
  },
);

router.delete(
  "/posts/:postId",
  requirePfvlUser,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const params = DeletePostParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const user = getPfvlUser(req);
    const [post] = await db
      .select()
      .from(postsTable)
      .where(eq(postsTable.id, params.data.postId))
      .limit(1);
    if (!post) {
      res.status(404).json({ error: "Publicação não encontrada" });
      return;
    }
    const ownsForumPost =
      post.kind === "forum" && post.authorUserId === user.id;
    if (user.role !== "admin" && !ownsForumPost) {
      res.status(403).json({ error: "Você não pode excluir esta publicação" });
      return;
    }
    await db.delete(postsTable).where(eq(postsTable.id, post.id));
    res.status(204).end();
  },
);

router.post(
  "/posts/:postId/comments",
  requirePfvlUser,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const params = ListCommentsParams.safeParse(req.params);
    const parsed = CreateCommentBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({
        error: !params.success
          ? params.error.message
          : parsed.error?.message ?? "Dados inválidos",
      });
      return;
    }

    const [post] = await db
      .select({
        id: postsTable.id,
        kind: postsTable.kind,
        authorUserId: postsTable.authorUserId,
      })
      .from(postsTable)
      .where(
        and(
          eq(postsTable.id, params.data.postId),
          eq(postsTable.status, "published"),
        ),
      )
      .limit(1);
    if (!post) {
      res.status(404).json({ error: "Publicação não encontrada" });
      return;
    }

    const parentCommentId = parsed.data.parentCommentId ?? null;
    let parentCommentAuthorUserId: number | null = null;
    if (parentCommentId !== null) {
      const [parent] = await db
        .select({
          id: commentsTable.id,
          parentCommentId: commentsTable.parentCommentId,
          authorUserId: commentsTable.authorUserId,
        })
        .from(commentsTable)
        .where(
          and(
            eq(commentsTable.id, parentCommentId),
            eq(commentsTable.postId, post.id),
            eq(commentsTable.status, "published"),
          ),
        )
        .limit(1);
      if (!parent || parent.parentCommentId !== null) {
        res.status(400).json({ error: "Selecione um comentário válido para responder" });
        return;
      }
      parentCommentAuthorUserId = parent.authorUserId;
    }

    const user = getPfvlUser(req);
    const created = await db.transaction(async (tx) => {
      const [comment] = await tx
        .insert(commentsTable)
        .values({
          postId: post.id,
          parentCommentId,
          authorName: user.displayName,
          authorUserId: user.id,
          body: parsed.data.body.trim(),
          status: "published",
        })
        .returning();
      await tx
        .update(postsTable)
        .set({ commentCount: sql`${postsTable.commentCount} + 1` })
        .where(eq(postsTable.id, post.id));

      const recipientUserId =
        parentCommentId === null
          ? post.authorUserId
          : parentCommentAuthorUserId ?? post.authorUserId;
      if (recipientUserId !== null) {
        const event: NotificationEvent = {
          eventKey: `comment:${comment.id}:${parentCommentId === null ? "new" : "reply"}`,
          type: "comment_reply",
          title:
            parentCommentId === null
              ? "Novo comentário na sua publicação"
              : "Responderam ao seu comentário",
          message: comment.body.slice(0, 180),
          href: `${postHref(post.kind, post.id)}#comment-${comment.id}`,
          actorUserId: user.id,
        };
        await persistNotificationBatch(
          notificationRows([recipientUserId], event),
          async (batch) => {
            await tx.insert(notificationsTable).values(batch).onConflictDoNothing();
          },
        );
      }
      return comment;
    });

    res.status(201).json(CreateCommentResponse.parse(created));
  },
);

router.post(
  "/polls/:pollId/vote",
  requirePfvlUser,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const params = VotePollParams.safeParse(req.params);
    const parsed = VotePollBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({
        error: !params.success
          ? params.error.message
          : parsed.error?.message ?? "Dados inválidos",
      });
      return;
    }

    const user = getPfvlUser(req);
    const result = await db.transaction(async (tx) => {
      const [poll] = await tx
        .select()
        .from(pollsTable)
        .where(eq(pollsTable.id, params.data.pollId))
        .for("update")
        .limit(1);
      if (!poll) return { error: "not_found" as const };
      if (poll.status !== "active") return { error: "closed" as const };

      await tx
        .insert(pollVotesTable)
        .values({
          pollId: poll.id,
          userId: user.id,
          vote: parsed.data.vote,
        })
        .onConflictDoUpdate({
          target: [pollVotesTable.pollId, pollVotesTable.userId],
          set: { vote: parsed.data.vote, updatedAt: new Date() },
        });

      return { poll };
    });

    if ("error" in result) {
      if (result.error === "not_found") {
        res.status(404).json({ error: "Enquete não encontrada" });
        return;
      }
      res.status(409).json({ error: "Esta enquete já foi encerrada" });
      return;
    }

    const [summary] = await pollSummaries([result.poll], user.id);
    res.json(VotePollResponse.parse(summary));
  },
);

router.delete(
  "/comments/:commentId",
  requirePfvlUser,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const params = DeleteCommentParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const user = getPfvlUser(req);
    const [comment] = await db
      .select()
      .from(commentsTable)
      .where(eq(commentsTable.id, params.data.commentId))
      .limit(1);
    if (!comment) {
      res.status(404).json({ error: "Comentário não encontrado" });
      return;
    }
    if (user.role !== "admin" && comment.authorUserId !== user.id) {
      res.status(403).json({ error: "Você não pode excluir este comentário" });
      return;
    }

    const replies = await db
      .select({ id: commentsTable.id })
      .from(commentsTable)
      .where(eq(commentsTable.parentCommentId, comment.id));
    if (replies.length && user.role !== "admin") {
      res.status(403).json({ error: "Uma resposta com comentários vinculados só pode ser removida pela equipe" });
      return;
    }

    await db.transaction(async (tx) => {
      const ids = [comment.id, ...replies.map((reply) => reply.id)];
      await tx.delete(commentsTable).where(inArray(commentsTable.id, ids));
      await tx
        .update(postsTable)
        .set({
          commentCount: sql`greatest(0, ${postsTable.commentCount} - ${ids.length})`,
        })
        .where(eq(postsTable.id, comment.postId));
    });
    res.status(204).end();
  },
);

router.get(
  "/admin/site-media",
  requirePfvlUser,
  requireAdmin,
  async (_req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const rows = await db
      .select({
        slot: siteMediaTable.slot,
        name: siteMediaTable.name,
        extension: siteMediaTable.extension,
      })
      .from(siteMediaTable);
    const bySlot = new Map(rows.map((row) => [row.slot, row]));
    const settings = siteMediaSlots.map((slot) => ({
      slot,
      name: bySlot.get(slot)?.name ?? null,
      extension: bySlot.get(slot)?.extension ?? defaultSiteMediaExtensions[slot],
    }));

    res.json(ListAdminSiteMediaResponse.parse(settings));
  },
);

router.patch(
  "/admin/site-media/:slot",
  requirePfvlUser,
  requireAdmin,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const params = UpdateAdminSiteMediaParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdateAdminSiteMediaBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const allowedExtensions =
      params.data.slot === "home_image"
        ? ["jpg", "jpeg", "png", "webp"]
        : ["mp4", "webm"];
    if (!allowedExtensions.includes(parsed.data.extension)) {
      res.status(400).json({
        error:
          "Para imagem, use JPG, JPEG, PNG ou WEBP; para vídeo, use MP4 ou WEBM.",
      });
      return;
    }

    const [updated] = await db
      .insert(siteMediaTable)
      .values({
        slot: params.data.slot,
        name: parsed.data.name,
        extension: parsed.data.extension,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: siteMediaTable.slot,
        set: {
          name: parsed.data.name,
          extension: parsed.data.extension,
          updatedAt: new Date(),
        },
      })
      .returning({
        slot: siteMediaTable.slot,
        name: siteMediaTable.name,
        extension: siteMediaTable.extension,
      });

    res.json(UpdateAdminSiteMediaResponse.parse(updated));
  },
);

router.get(
  "/admin/taxonomy",
  requirePfvlUser,
  requireAdmin,
  async (_req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const rows = await db
      .select()
      .from(taxonomyTable)
      .orderBy(taxonomyTable.kind, taxonomyTable.type, taxonomyTable.name);
    res.json(ListAdminTaxonomyResponse.parse(rows));
  },
);

router.post(
  "/admin/taxonomy",
  requirePfvlUser,
  requireAdmin,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const parsed = CreateAdminTaxonomyBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const name = parsed.data.name.trim();
    if (name.length < 2 || (parsed.data.type === "tag" && name.length > 40)) {
      res.status(400).json({
        error: parsed.data.type === "tag"
          ? "O marcador deve ter entre 2 e 40 caracteres."
          : "A categoria deve ter pelo menos 2 caracteres.",
      });
      return;
    }
    const [created] = await db
      .insert(taxonomyTable)
      .values({ kind: parsed.data.kind, type: parsed.data.type, name })
      .onConflictDoNothing()
      .returning();
    if (!created) {
      res.status(409).json({ error: "Já existe uma opção com esse nome nesta área." });
      return;
    }
    res.status(201).json(CreateAdminTaxonomyResponse.parse(created));
  },
);

router.patch(
  "/admin/taxonomy/:taxonomyId",
  requirePfvlUser,
  requireAdmin,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const params = UpdateAdminTaxonomyParams.safeParse(req.params);
    const parsed = UpdateAdminTaxonomyBody.safeParse(req.body);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const name = parsed.data.name.trim();
    if (name.length < 2 || name.length > 100) {
      res.status(400).json({ error: "O nome deve ter entre 2 e 100 caracteres." });
      return;
    }

    const result = await db.transaction(async (tx) => {
      const [item] = await tx
        .select()
        .from(taxonomyTable)
        .where(eq(taxonomyTable.id, params.data.taxonomyId))
        .limit(1);
      if (!item) return { kind: "not_found" as const };

      const duplicates = await tx
        .select({ id: taxonomyTable.id })
        .from(taxonomyTable)
        .where(and(
          eq(taxonomyTable.kind, item.kind),
          eq(taxonomyTable.type, item.type),
          sql`lower(${taxonomyTable.name}) = lower(${name})`,
        ));
      if (duplicates.some((duplicate) => duplicate.id !== item.id)) {
        return { kind: "duplicate" as const };
      }

      const [updated] = await tx
        .update(taxonomyTable)
        .set({ name })
        .where(eq(taxonomyTable.id, item.id))
        .returning();
      if (!updated) return { kind: "not_found" as const };
      const updatedAt = new Date();

      if (item.type === "category") {
        await tx
          .update(postsTable)
          .set({ category: name, updatedAt })
          .where(and(
            eq(postsTable.kind, item.kind),
            sql`lower(btrim(${postsTable.category})) = lower(${item.name})`,
          ));
      } else {
        await tx
          .update(postsTable)
          .set({
            tags: sql`ARRAY(
              SELECT CASE
                WHEN lower(btrim(tag_row.tag_value)) = lower(${item.name}) THEN ${name}
                ELSE tag_row.tag_value
              END
              FROM unnest(${postsTable.tags}) WITH ORDINALITY AS tag_row(tag_value, ordinality)
              ORDER BY tag_row.ordinality
            )`,
            updatedAt,
          })
          .where(and(
            eq(postsTable.kind, item.kind),
            sql`EXISTS (
              SELECT 1
              FROM unnest(${postsTable.tags}) AS existing_tag(tag_value)
              WHERE lower(btrim(existing_tag.tag_value)) = lower(${item.name})
            )`,
          ));
      }

      return { kind: "updated" as const, item: updated };
    });

    if (result.kind === "not_found") {
      res.status(404).json({ error: "Categoria ou marcador não encontrado." });
      return;
    }
    if (result.kind === "duplicate") {
      res.status(409).json({ error: "Já existe uma opção com esse nome nesta área." });
      return;
    }

    res.json(UpdateAdminTaxonomyResponse.parse(result.item));
  },
);

router.delete(
  "/admin/taxonomy/:taxonomyId",
  requirePfvlUser,
  requireAdmin,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const params = DeleteAdminTaxonomyParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [item] = await db
      .select()
      .from(taxonomyTable)
      .where(eq(taxonomyTable.id, params.data.taxonomyId))
      .limit(1);
    if (!item) {
      res.status(404).json({ error: "Categoria ou marcador não encontrado." });
      return;
    }

    const usedBy = item.type === "category"
      ? sql`lower(btrim(${postsTable.category})) = lower(${item.name})`
      : sql`EXISTS (
          SELECT 1
          FROM unnest(${postsTable.tags}) AS existing_tag(tag_value)
          WHERE lower(btrim(existing_tag.tag_value)) = lower(${item.name})
        )`;
    const [usage] = await db
      .select({ id: postsTable.id })
      .from(postsTable)
      .where(and(eq(postsTable.kind, item.kind), usedBy))
      .limit(1);
    if (usage) {
      res.status(409).json({
        error: "Esta opção está sendo usada. Você pode editar ou alterar ela nas publicações antes de excluí-la.",
      });
      return;
    }

    await db
      .delete(taxonomyTable)
      .where(eq(taxonomyTable.id, item.id));
    DeleteAdminTaxonomyResponse.parse(undefined);
    res.status(204).end();
  },
);

router.get(
  "/admin/posts",
  requirePfvlUser,
  requireAdmin,
  async (_req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const rows = await db
      .select()
      .from(postsTable)
      .orderBy(desc(postsTable.updatedAt));
    res.json(ListAdminPostsResponse.parse(rows.map(postResponse)));
  },
);

router.get(
  "/admin/polls",
  requirePfvlUser,
  requireAdmin,
  async (_req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const rows = await db
      .select()
      .from(pollsTable)
      .orderBy(desc(pollsTable.createdAt))
      .limit(100);
    res.json(ListAdminPollsResponse.parse(await pollSummaries(rows)));
  },
);

router.post(
  "/admin/polls",
  requirePfvlUser,
  requireAdmin,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const parsed = CreateAdminPollBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const question = parsed.data.question.trim();
    if (question.length < 5) {
      res.status(400).json({ error: "A pergunta precisa ter pelo menos 5 caracteres." });
      return;
    }

    const user = getPfvlUser(req);
    const [poll] = await db.transaction(async (tx) => {
      await tx
        .update(pollsTable)
        .set({ status: "closed", closedAt: new Date() })
        .where(eq(pollsTable.status, "active"));
      return tx
        .insert(pollsTable)
        .values({
          question,
          details: parsed.data.details?.trim() ?? "",
          status: "active",
          createdBy: user.id,
        })
        .returning();
    });

    const [summary] = await pollSummaries([poll], user.id);
    res
      .status(201)
      .json(CreateAdminPollResponse.parse(summary));
  },
);

router.post(
  "/admin/polls/:pollId/close",
  requirePfvlUser,
  requireAdmin,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const params = CloseAdminPollParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [existing] = await db
      .select()
      .from(pollsTable)
      .where(eq(pollsTable.id, params.data.pollId))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "Enquete não encontrada" });
      return;
    }

    const [poll] =
      existing.status === "active"
        ? await db
            .update(pollsTable)
            .set({ status: "closed", closedAt: new Date() })
            .where(eq(pollsTable.id, existing.id))
            .returning()
        : [existing];

    const [summary] = await pollSummaries([poll]);
    res.json(CloseAdminPollResponse.parse(summary));
  },
);

router.get(
  "/admin/users",
  requirePfvlUser,
  requireAdmin,
  async (_req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const rows = await db
      .select()
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt));
    res.json(ListAdminUsersResponse.parse(rows));
  },
);

router.patch(
  "/admin/users/:userId",
  requirePfvlUser,
  requireAdmin,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const params = UpdateAdminUserParams.safeParse(req.params);
    const parsed = UpdateAdminUserBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({
        error: !params.success
          ? params.error.message
          : parsed.error?.message ?? "Dados inválidos",
      });
      return;
    }
    const currentUser = getPfvlUser(req);
    const [target] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, params.data.userId))
      .limit(1);
    if (!target) {
      res.status(404).json({ error: "Conta não encontrada" });
      return;
    }
    const demotingOrSuspendingAdmin =
      target.role === "admin" &&
      ((parsed.data.role !== undefined && parsed.data.role !== "admin") ||
        parsed.data.status === "suspended");
    if (target.id === currentUser.id && demotingOrSuspendingAdmin) {
      res.status(403).json({ error: "Não é possível remover seu próprio acesso administrativo" });
      return;
    }
    if (demotingOrSuspendingAdmin) {
      const activeAdmins = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(
          and(
            eq(usersTable.role, "admin"),
            eq(usersTable.status, "active"),
          ),
        );
      if (
        activeAdmins.length <= 1 &&
        (parsed.data.status === "suspended" ||
          parsed.data.role === "member")
      ) {
        res.status(409).json({ error: "O portal precisa manter ao menos um administrador ativo" });
        return;
      }
    }

    const [updated] = await db
      .update(usersTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(usersTable.id, target.id))
      .returning();
    res.json(UpdateAdminUserResponse.parse(updated));
  },
);

router.patch(
  "/admin/suggestions/:suggestionId",
  requirePfvlUser,
  requireAdmin,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const params = UpdateAdminSuggestionParams.safeParse(req.params);
    const parsed = UpdateAdminSuggestionBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({
        error: !params.success
          ? params.error.message
          : parsed.error?.message ?? "Dados inválidos",
      });
      return;
    }
    const admin = getPfvlUser(req);
    const updated = await db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(suggestionsTable)
        .where(eq(suggestionsTable.id, params.data.suggestionId))
        .limit(1);
      if (!current) return null;

      const [suggestion] = await tx
        .update(suggestionsTable)
        .set({ status: parsed.data.status })
        .where(eq(suggestionsTable.id, current.id))
        .returning();

      if (current.status !== suggestion.status) {
        const recipients =
          current.authorUserId === null
            ? await activeNotificationRecipients()
            : [current.authorUserId];
        const statusLabels = {
          under_review: "em análise",
          planned: "planejada",
          in_progress: "em andamento",
          completed: "concluída",
        } as const;
        const event: NotificationEvent = {
          eventKey: `suggestion:${suggestion.id}:status:${randomUUID()}`,
          type: "suggestion_status",
          title: "Sua sugestão teve uma atualização",
          message: `"${suggestion.title}" agora está ${statusLabels[suggestion.status as keyof typeof statusLabels] ?? suggestion.status}.`,
          href: "/suggestions",
          actorUserId: admin.id,
        };
        await persistNotificationBatch(
          notificationRows(recipients, event),
          async (batch) => {
            await tx.insert(notificationsTable).values(batch).onConflictDoNothing();
          },
        );
      }
      return suggestion;
    });
    if (!updated) {
      res.status(404).json({ error: "Sugestão não encontrada" });
      return;
    }
    res.json(UpdateAdminSuggestionResponse.parse(updated));
  },
);

router.get(
  "/site-media/files/:slot",
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const params = GetSiteMediaFileParams.safeParse(req.params);
    if (!params.success) {
      res.status(404).end();
      return;
    }

    const slot = params.data.slot;
    const [media] = await db
      .select()
      .from(siteMediaTable)
      .where(eq(siteMediaTable.slot, slot))
      .limit(1);
    if (!media?.name) {
      res.status(404).end();
      return;
    }

    const allowedExtensions =
      slot === "home_image"
        ? ["jpg", "jpeg", "png", "webp"]
        : ["mp4", "webm"];
    const contentType = siteMediaTypes[media.extension];
    if (!allowedExtensions.includes(media.extension) || !contentType) {
      res.status(404).end();
      return;
    }

    const {
      CLOUDFLARE_ACCOUNT_ID: accountId,
      R2_ACCESS_KEY_ID: accessKeyId,
      R2_SECRET_ACCESS_KEY: secretAccessKey,
      R2_BUCKET_NAME: bucketName,
    } = process.env;
    if (
      !accountId ||
      !/^[a-f0-9]{32}$/i.test(accountId) ||
      !accessKeyId ||
      !secretAccessKey ||
      !bucketName
    ) {
      res.status(503).end();
      return;
    }

    const rangeHeader = GetSiteMediaFileHeader.safeParse(
      req.headers.range ? { Range: req.headers.range } : {},
    );
    if (!rangeHeader.success) {
      res.status(400).end();
      return;
    }

    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
    try {
      const object = await client.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: `${siteMediaFolders[slot]}/${media.name}.${media.extension}`,
          Range: rangeHeader.data.Range,
        }),
      );
      if (!object.Body) {
        res.status(404).end();
        return;
      }

      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${media.name}.${media.extension}"`,
      );
      res.setHeader("X-Content-Type-Options", "nosniff");
      if (object.ContentRange) {
        res.setHeader("Content-Range", object.ContentRange);
      }
      if (typeof object.ContentLength === "number") {
        res.setHeader("Content-Length", String(object.ContentLength));
      }
      res.status(object.ContentRange ? 206 : 200);

      await pipeline(
        object.Body as unknown as NodeJS.ReadableStream,
        res,
      );
    } catch (error) {
      const status =
        typeof error === "object" && error !== null && "$metadata" in error
          ? (error as { $metadata?: { httpStatusCode?: number } }).$metadata
              ?.httpStatusCode
          : undefined;
      if (status === 404) {
        res.status(404).end();
        return;
      }
      if (status === 416) {
        res.status(416).end();
        return;
      }
      logger.error({ err: error, slot }, "Could not read a public PFVL site media object from R2");
      if (res.headersSent) {
        res.destroy(error instanceof Error ? error : undefined);
        return;
      }
      res.status(502).end();
    } finally {
      client.destroy();
    }
  },
);

router.get(
  "/uploads/:userId/:fileName",
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const { userId, fileName } = req.params;
    if (
      !/^\d+$/.test(userId) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp)$/i.test(
        fileName,
      )
    ) {
      res.status(404).end();
      return;
    }

    const {
      CLOUDFLARE_ACCOUNT_ID: accountId,
      R2_ACCESS_KEY_ID: accessKeyId,
      R2_SECRET_ACCESS_KEY: secretAccessKey,
      R2_BUCKET_NAME: bucketName,
    } = process.env;
    if (
      !accountId ||
      !/^[a-f0-9]{32}$/i.test(accountId) ||
      !accessKeyId ||
      !secretAccessKey ||
      !bucketName
    ) {
      res.status(503).end();
      return;
    }

    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
    try {
      const object = await client.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: `posts/${userId}/${fileName}`,
        }),
      );
      const contentType = object.ContentType;
      if (
        !object.Body ||
        !contentType ||
        !["image/jpeg", "image/png", "image/webp"].includes(contentType ?? "")
      ) {
        res.status(404).end();
        return;
      }
      const image = await object.Body.transformToByteArray();
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("Content-Length", String(image.byteLength));
      res.setHeader("Content-Type", contentType);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.status(200).end(Buffer.from(image));
    } catch (error) {
      const status =
        typeof error === "object" && error !== null && "$metadata" in error
          ? (error as { $metadata?: { httpStatusCode?: number } }).$metadata
              ?.httpStatusCode
          : undefined;
      if (status === 404) {
        res.status(404).end();
        return;
      }
      logger.error(
        { status },
        "Could not read a public PFVL image from R2",
      );
      res.status(502).end();
    } finally {
      client.destroy();
    }
  },
);

router.post(
  "/uploads/presign",
  requirePfvlUser,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const parsed = CreateImageUploadBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const {
      CLOUDFLARE_ACCOUNT_ID: accountId,
      R2_ACCESS_KEY_ID: accessKeyId,
      R2_SECRET_ACCESS_KEY: secretAccessKey,
      R2_BUCKET_NAME: bucketName,
    } = process.env;
    if (
      !accountId ||
      !/^[a-f0-9]{32}$/i.test(accountId) ||
      !accessKeyId ||
      !secretAccessKey ||
      !bucketName
    ) {
      res.status(503).json({ error: "O armazenamento de imagens ainda não está configurado" });
      return;
    }
    if (parsed.data.sizeBytes > 5 * 1024 * 1024) {
      res.status(400).json({ error: "Imagem ou endereço de armazenamento inválido" });
      return;
    }

    const extensionByType: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const user = getPfvlUser(req);
    const fileName = `${randomUUID()}.${extensionByType[parsed.data.contentType]}`;
    const key = `posts/${user.id}/${fileName}`;
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
    try {
      const uploadUrl = await getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          ContentType: parsed.data.contentType,
          ContentLength: parsed.data.sizeBytes,
        }),
        { expiresIn: 300 },
      );
      const publicUrl = `/api/uploads/${user.id}/${fileName}`;
      res.json(CreateImageUploadResponse.parse({ uploadUrl, publicUrl }));
    } catch (error) {
      logger.error({ err: error }, "Could not create a Cloudflare R2 upload URL");
      res.status(503).json({ error: "Não foi possível preparar o envio da imagem" });
    } finally {
      client.destroy();
    }
  },
);

router.post(
  "/suggestions",
  requirePfvlUser,
  async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const parsed = CreateSuggestionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const user = getPfvlUser(req);
    const recipients = await activeNotificationRecipients();
    const created = await db.transaction(async (tx) => {
      const [suggestion] = await tx
        .insert(suggestionsTable)
        .values({
          title: parsed.data.title.trim(),
          details: parsed.data.details.trim(),
          category: parsed.data.category.trim(),
          authorName: user.displayName,
          authorUserId: user.id,
        })
        .returning();

      const event: NotificationEvent = {
        eventKey: `suggestion:${suggestion.id}:new`,
        type: "new_suggestion",
        title: "Nova sugestão no roadmap",
        message: `${user.displayName}: ${suggestion.title}`,
        href: "/suggestions",
        actorUserId: user.id,
      };
      await persistNotificationBatch(
        notificationRows(recipients, event),
        async (batch) => {
          await tx.insert(notificationsTable).values(batch).onConflictDoNothing();
        },
      );
      return suggestion;
    });

    res.status(201).json(CreateSuggestionResponse.parse(created));
  },
);

router.get("/suggestions", async (_req: ExpressRequest, res: ExpressResponse): Promise<void> => {
  const rows = await db
    .select()
    .from(suggestionsTable)
    .orderBy(desc(suggestionsTable.createdAt));
  res.json(ListSuggestionsResponse.parse(rows));
});

const illustrativeIndicators: Indicator[] = [
  {
    code: "CDI",
    name: "CDI",
    value: 10.65,
    unit: "% ao ano",
    change: 0,
    updatedAt: new Date(),
    source: "Dados demonstrativos",
    illustrative: true,
    history: [10.5, 10.5, 10.65, 10.65, 10.65, 10.65],
  },
  {
    code: "SELIC",
    name: "Selic",
    value: 10.75,
    unit: "% ao ano",
    change: 0,
    updatedAt: new Date(),
    source: "Dados demonstrativos",
    illustrative: true,
    history: [10.5, 10.5, 10.5, 10.75, 10.75, 10.75],
  },
  {
    code: "IPCA",
    name: "IPCA",
    value: 4.5,
    unit: "% em 12 meses",
    change: 0,
    updatedAt: new Date(),
    source: "Dados demonstrativos",
    illustrative: true,
    history: [4.2, 4.35, 4.5, 4.45, 4.5, 4.5],
  },
  {
    code: "INPC",
    name: "INPC",
    value: 3.8,
    unit: "% em 12 meses",
    change: 0,
    updatedAt: new Date(),
    source: "Dados demonstrativos",
    illustrative: true,
    history: [3.6, 3.65, 3.7, 3.75, 3.8, 3.8],
  },
];

router.get("/indicators", async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
  const providerUrl = process.env.PFVL_INDICATORS_API_URL;
  if (!providerUrl) {
    res.json(ListIndicatorsResponse.parse(illustrativeIndicators));
    return;
  }

  try {
    // Keep the Node fetch contract independent of Vercel's ambient Response typings.
    const result = (await globalThis.fetch(providerUrl, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    })) as unknown as {
      readonly ok: boolean;
      readonly status: number;
      json(): Promise<unknown>;
    };
    if (!result.ok) {
      logger.error(
        { status: result.status },
        "PFVL indicators provider returned an error",
      );
      res.status(502).json({ error: "Fonte de indicadores indisponível" });
      return;
    }

    const payload: unknown = await result.json();
    const parsed = ListIndicatorsResponse.safeParse(payload);
    if (!parsed.success) {
      logger.error(
        { errors: parsed.error.message },
        "PFVL indicators provider returned an invalid response",
      );
      res.status(502).json({ error: "Formato de indicadores inválido" });
      return;
    }

    res.json(parsed.data);
  } catch (error) {
    logger.error({ err: error }, "Could not reach PFVL indicators provider");
    res.status(502).json({ error: "Fonte de indicadores indisponível" });
  }
});

export default router;
