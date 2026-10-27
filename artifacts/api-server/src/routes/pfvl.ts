import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
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
  CreateAdminPollBody,
  CreateAdminPollResponse,
  DeleteCommentParams,
  DeletePostParams,
  GetActivePollResponse,
  GetDashboardResponse,
  GetCurrentUserResponse,
  GetPostParams,
  GetPostResponse,
  Indicator,
  ListAdminPostsResponse,
  ListAdminPollsResponse,
  ListAdminUsersResponse,
  ListCommentsParams,
  ListCommentsResponse,
  ListIndicatorsResponse,
  ListPostsQueryParams,
  ListPostsResponse,
  ListSuggestionsResponse,
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
  or,
  postsTable,
  pollVotesTable,
  pollsTable,
  sql,
  suggestionsTable,
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

function postResponse(post: PublicPostRow) {
  return {
    ...post,
    coverImageUrl: post.coverImageUrl ?? null,
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

  const [created] = await db
    .insert(postsTable)
    .values({
      title: input.title.trim(),
      excerpt: input.excerpt?.trim() || input.body.trim().slice(0, 220),
      body: input.body.trim(),
      kind: input.kind,
      category: input.category.trim(),
      tags: input.tags ?? [],
      authorName: user.displayName,
      authorUserId: user.id,
      coverImageUrl: input.coverImageUrl ?? null,
      videoUrl: input.videoUrl ?? null,
      status: user.role === "admin" ? (input.status ?? "published") : "published",
    })
    .returning();

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

    const [updated] = await db
      .update(postsTable)
      .set({
        ...parsed.data,
        title: parsed.data.title?.trim(),
        excerpt: parsed.data.excerpt?.trim(),
        body: parsed.data.body?.trim(),
        category: parsed.data.category?.trim(),
        authorUserId: post.authorUserId,
        updatedAt: new Date(),
      })
      .where(eq(postsTable.id, post.id))
      .returning();

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
      .select({ id: postsTable.id })
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
    if (parentCommentId !== null) {
      const [parent] = await db
        .select({
          id: commentsTable.id,
          parentCommentId: commentsTable.parentCommentId,
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
    const [updated] = await db
      .update(suggestionsTable)
      .set({ status: parsed.data.status })
      .where(eq(suggestionsTable.id, params.data.suggestionId))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Sugestão não encontrada" });
      return;
    }
    res.json(UpdateAdminSuggestionResponse.parse(updated));
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
      R2_PUBLIC_BASE_URL: publicBaseUrl,
    } = process.env;
    if (
      !accountId ||
      !/^[a-f0-9]{32}$/i.test(accountId) ||
      !accessKeyId ||
      !secretAccessKey ||
      !bucketName ||
      !publicBaseUrl
    ) {
      res.status(503).json({ error: "O armazenamento de imagens ainda não está configurado" });
      return;
    }
    if (
      parsed.data.sizeBytes > 5 * 1024 * 1024 ||
      !safeCoverUrl(publicBaseUrl)
    ) {
      res.status(400).json({ error: "Imagem ou endereço de armazenamento inválido" });
      return;
    }

    const extensionByType: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const user = getPfvlUser(req);
    const key = `posts/${user.id}/${randomUUID()}.${extensionByType[parsed.data.contentType]}`;
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
      const base = new URL(publicBaseUrl);
      if (base.protocol !== "https:") {
        res.status(503).json({ error: "O endereço público do R2 precisa usar HTTPS" });
        return;
      }
      const publicUrl = `${base.toString().replace(/\/+$/, "")}/${key}`;
      res.json(CreateImageUploadResponse.parse({ uploadUrl, publicUrl }));
    } catch (error) {
      logger.error({ err: error }, "Could not create a Cloudflare R2 upload URL");
      res.status(503).json({ error: "Não foi possível preparar o envio da imagem" });
    } finally {
      client.destroy();
    }
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
