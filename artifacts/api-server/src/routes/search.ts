import { getAuth } from "@clerk/express";
import { Router } from "express";
import { isNotNull, type SQLWrapper } from "drizzle-orm";
import {
  and,
  db,
  desc,
  eq,
  inArray,
  or,
  sql,
  supportRequestCommentsTable,
  supportRequestsTable,
  usersTable,
  postsTable,
  commentsTable,
} from "@workspace/db";
import {
  SearchPortalQueryParams,
  SearchPortalResponse,
} from "@workspace/api-zod";
import type { PfvlRequest as ExpressRequest, PfvlResponse as ExpressResponse } from "../lib/route-types.js";

const router = Router();
const pageSize = 6;
const accents = "áàâãäéèêëíìîïóòôõöúùûüç";
const plainLetters = "aaaaaeeeeiiiiooooouuuuc";

type SearchArea =
  | "content"
  | "community"
  | "news"
  | "tutorials"
  | "roadmap"
  | "private";

type SearchItem = {
  id: number;
  type:
    | "article"
    | "community_topic"
    | "community_comment"
    | "update"
    | "tutorial"
    | "roadmap_item"
    | "support_request"
    | "private_suggestion"
    | "private_update";
  title: string;
  excerpt: string;
  href: string;
  sortAt: Date;
};

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR");
}

function normalizeSql(value: SQLWrapper) {
  return sql`translate(lower(coalesce(${value}, '')), ${accents}, ${plainLetters})`;
}

function fieldMatches(value: SQLWrapper, searchTerm: string) {
  return sql`strpos(${normalizeSql(value)}, ${searchTerm}) > 0`;
}

function stripMarkup(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function excerptAround(value: string, query: string): string {
  const text = stripMarkup(value);
  if (!text) return "";

  const queryNormalized = normalizeSearchText(query);
  let normalizedText = "";
  const sourceOffsets: number[] = [];
  let sourceOffset = 0;
  for (const character of text) {
    const normalizedCharacter = normalizeSearchText(character);
    normalizedText += normalizedCharacter;
    for (let index = 0; index < normalizedCharacter.length; index += 1) {
      sourceOffsets.push(sourceOffset);
    }
    sourceOffset += character.length;
  }

  const matchIndex = normalizedText.indexOf(queryNormalized);
  const matchOffset = matchIndex < 0 ? 0 : sourceOffsets[matchIndex] ?? 0;
  const start = Math.max(0, matchOffset - 72);
  const end = Math.min(text.length, start + 190);
  const snippet = `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
  return snippet;
}

function postPath(kind: string, postId: number): string {
  if (kind === "blog") return `/content/${postId}`;
  if (kind === "news") return `/news/${postId}`;
  if (kind === "help") return `/help/${postId}`;
  return `/community/${postId}`;
}

function pageSlice(items: SearchItem[], page: number) {
  const offset = (page - 1) * pageSize;
  const sorted = items.sort((left, right) => right.sortAt.getTime() - left.sortAt.getTime() || right.id - left.id);
  return {
    results: sorted.slice(offset, offset + pageSize).map(({ sortAt: _sortAt, ...result }) => result),
    hasMore: sorted.length > offset + pageSize,
  };
}

function postSearchCondition(searchTerm: string) {
  const cleanBody = sql`regexp_replace(coalesce(${postsTable.body}, ''), '<[^>]*>', ' ', 'g')`;
  const matchingTag = sql`EXISTS (
    SELECT 1
    FROM unnest(${postsTable.tags}) AS tag_value
    WHERE strpos(${normalizeSql(sql.raw("tag_value"))}, ${searchTerm}) > 0
  )`;
  return or(
    fieldMatches(postsTable.title, searchTerm),
    fieldMatches(cleanBody, searchTerm),
    fieldMatches(postsTable.category, searchTerm),
    matchingTag,
  )!;
}

async function searchPosts(
  kind: "blog" | "news" | "forum" | "help",
  searchTerm: string,
  query: string,
  page: number,
  type: SearchItem["type"],
): Promise<SearchItem[]> {
  const rows = await db
    .select({
      id: postsTable.id,
      title: postsTable.title,
      body: postsTable.body,
      category: postsTable.category,
      tags: postsTable.tags,
      updatedAt: postsTable.updatedAt,
      createdAt: postsTable.createdAt,
      kind: postsTable.kind,
    })
    .from(postsTable)
    .where(
      and(
        eq(postsTable.status, "published"),
        eq(postsTable.kind, kind),
        postSearchCondition(searchTerm),
      ),
    )
    .orderBy(desc(postsTable.updatedAt), desc(postsTable.id))
    .limit((page - 1) * pageSize + pageSize + 1);

  return rows.map((row) => {
    const tagText = row.tags.join(", ");
    const matchedText = [row.body, row.title, row.category, tagText]
      .find((value) => normalizeSearchText(stripMarkup(value)).includes(searchTerm)) ?? row.category;
    return {
      id: row.id,
      type,
      title: row.title,
      excerpt: excerptAround(matchedText, query),
      href: postPath(row.kind, row.id),
      sortAt: row.updatedAt,
    };
  });
}

async function searchCommunityComments(
  searchTerm: string,
  query: string,
  page: number,
): Promise<SearchItem[]> {
  const rows = await db
    .select({
      id: commentsTable.id,
      postId: commentsTable.postId,
      title: postsTable.title,
      body: commentsTable.body,
      createdAt: commentsTable.createdAt,
    })
    .from(commentsTable)
    .innerJoin(postsTable, eq(commentsTable.postId, postsTable.id))
    .where(
      and(
        eq(postsTable.kind, "forum"),
        eq(postsTable.status, "published"),
        sql`COALESCE(to_jsonb(${commentsTable})->>'status', 'published') = 'published'`,
        sql`${commentsTable.parentCommentId} IS NULL`,
        fieldMatches(commentsTable.body, searchTerm),
      ),
    )
    .orderBy(desc(commentsTable.createdAt), desc(commentsTable.id))
    .limit((page - 1) * pageSize + pageSize + 1);

  return rows.map((row) => ({
    id: row.id,
    type: "community_comment",
    title: row.title,
    excerpt: excerptAround(row.body, query),
    href: `${postPath("forum", row.postId)}#comment-${row.id}`,
    sortAt: row.createdAt,
  }));
}

async function searchRoadmap(searchTerm: string, query: string, page: number): Promise<SearchItem[]> {
  const matchingStatus = sql`CASE ${supportRequestsTable.roadmapStatus}
    WHEN 'planned' THEN 'planejada'
    WHEN 'in_progress' THEN 'em desenvolvimento'
    WHEN 'available' THEN 'disponível'
    ELSE ''
  END`;
  const rows = await db
    .select({
      id: supportRequestsTable.id,
      title: supportRequestsTable.roadmapTitle,
      description: supportRequestsTable.roadmapDescription,
      categoryName: supportRequestsTable.categoryName,
      roadmapStatus: supportRequestsTable.roadmapStatus,
      approvedAt: supportRequestsTable.approvedAt,
    })
    .from(supportRequestsTable)
    .where(
      and(
        eq(supportRequestsTable.requestType, "suggestion"),
        isNotNull(supportRequestsTable.approvedAt),
        isNotNull(supportRequestsTable.roadmapTitle),
        isNotNull(supportRequestsTable.roadmapDescription),
        isNotNull(supportRequestsTable.roadmapStatus),
        or(
          fieldMatches(supportRequestsTable.roadmapTitle, searchTerm),
          fieldMatches(supportRequestsTable.roadmapDescription, searchTerm),
          fieldMatches(supportRequestsTable.categoryName, searchTerm),
          fieldMatches(matchingStatus, searchTerm),
        ),
      ),
    )
    .orderBy(desc(supportRequestsTable.approvedAt), desc(supportRequestsTable.id))
    .limit((page - 1) * pageSize + pageSize + 1);

  return rows.map((row) => {
    const title = row.title ?? "";
    const description = row.description ?? "";
    const category = row.categoryName ?? "";
    const statusLabel =
      row.roadmapStatus === "planned"
        ? "Planejada"
        : row.roadmapStatus === "in_progress"
          ? "Em desenvolvimento"
          : "Disponível";
    const matchedText = [description, title, category, statusLabel]
      .find((value) => normalizeSearchText(stripMarkup(value)).includes(searchTerm)) ?? description;
    return {
      id: row.id,
      type: "roadmap_item",
      title,
      excerpt: excerptAround(matchedText, query),
      href: `/suggestions#roadmap-${row.id}`,
      sortAt: row.approvedAt ?? new Date(0),
    };
  });
}

async function searchPrivateItems(userId: number, searchTerm: string, query: string, page: number): Promise<SearchItem[]> {
  const privateStatusText = sql`CASE ${supportRequestsTable.status}
    WHEN 'new' THEN 'recebida'
    WHEN 'in_progress' THEN 'em andamento'
    WHEN 'completed' THEN 'concluída'
    ELSE ''
  END`;
  const requestMatch = or(
    fieldMatches(supportRequestsTable.protocol, searchTerm),
    fieldMatches(supportRequestsTable.subjectName, searchTerm),
    fieldMatches(supportRequestsTable.title, searchTerm),
    fieldMatches(supportRequestsTable.categoryName, searchTerm),
    fieldMatches(supportRequestsTable.message, searchTerm),
    fieldMatches(privateStatusText, searchTerm),
  )!;
  const requests = await db
    .select({
      id: supportRequestsTable.id,
      requestType: supportRequestsTable.requestType,
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
        eq(supportRequestsTable.requesterUserId, userId),
        inArray(supportRequestsTable.requestType, ["support", "suggestion"]),
        requestMatch,
      ),
    )
    .orderBy(desc(supportRequestsTable.updatedAt), desc(supportRequestsTable.id))
    .limit((page - 1) * pageSize + pageSize + 1);

  const privateComments = await db
    .select({
      id: supportRequestCommentsTable.id,
      requestId: supportRequestsTable.id,
      requestType: supportRequestsTable.requestType,
      title: supportRequestsTable.title,
      subjectName: supportRequestsTable.subjectName,
      message: supportRequestCommentsTable.message,
      createdAt: supportRequestCommentsTable.createdAt,
    })
    .from(supportRequestCommentsTable)
    .innerJoin(
      supportRequestsTable,
      eq(supportRequestCommentsTable.requestId, supportRequestsTable.id),
    )
    .where(
      and(
        eq(supportRequestsTable.requesterUserId, userId),
        inArray(supportRequestsTable.requestType, ["support", "suggestion"]),
        fieldMatches(supportRequestCommentsTable.message, searchTerm),
      ),
    )
    .orderBy(desc(supportRequestCommentsTable.createdAt), desc(supportRequestCommentsTable.id))
    .limit((page - 1) * pageSize + pageSize + 1);

  const requestItems: SearchItem[] = requests.map((row) => {
    const isSuggestion = row.requestType === "suggestion";
    const matchedText = [
      row.message,
      row.title ?? "",
      row.categoryName ?? "",
      row.subjectName,
      row.protocol,
      row.status === "new" ? "Recebida" : row.status === "in_progress" ? "Em andamento" : "Concluída",
    ].find((value) => normalizeSearchText(stripMarkup(value)).includes(searchTerm)) ?? row.message;
    return {
      id: row.id,
      type: isSuggestion ? "private_suggestion" : "support_request",
      title: isSuggestion ? row.title ?? "Sugestão enviada" : row.subjectName,
      excerpt: excerptAround(matchedText, query),
      href: isSuggestion
        ? `/suggestions#suggestion-${row.id}`
        : `/help/requests#support-request-${row.id}`,
      sortAt: row.updatedAt,
    };
  });
  const commentItems: SearchItem[] = privateComments.map((row) => {
    const isSuggestion = row.requestType === "suggestion";
    return {
      id: row.id,
      type: "private_update",
      title: `Atualização: ${isSuggestion ? row.title ?? "sugestão" : row.subjectName}`,
      excerpt: excerptAround(row.message, query),
      href: isSuggestion
        ? `/suggestions#suggestion-${row.requestId}`
        : `/help/requests#support-request-${row.requestId}`,
      sortAt: row.createdAt,
    };
  });
  return [...requestItems, ...commentItems];
}

async function getActiveViewerId(req: ExpressRequest): Promise<number | null> {
  let clerkUserId: string | null = null;
  try {
    clerkUserId = getAuth(req as unknown as Parameters<typeof getAuth>[0]).userId;
  } catch {
    return null;
  }
  if (!clerkUserId) return null;
  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.clerkUserId, clerkUserId),
        eq(usersTable.status, "active"),
      ),
    )
    .limit(1);
  return user?.id ?? null;
}

router.get("/search", async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
  const parsed = SearchPortalQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const query = parsed.data.q.trim();
  const searchTerm = normalizeSearchText(query);
  if (searchTerm.length < 2) {
    res.status(400).json({ error: "Digite pelo menos 2 caracteres para pesquisar" });
    return;
  }

  const page = parsed.data.page ?? 1;
  const requestedArea = parsed.data.area as SearchArea | undefined;
  const viewerUserId = await getActiveViewerId(req);
  const groups: Array<{ area: SearchArea; results: Omit<SearchItem, "sortAt">[]; hasMore: boolean }> = [];

  const addGroup = async (area: SearchArea, itemsPromise: Promise<SearchItem[]>) => {
    const items = await itemsPromise;
    const { results, hasMore } = pageSlice(items, page);
    groups.push({ area, results, hasMore });
  };

  const searchAll = !requestedArea;
  const jobs: Promise<void>[] = [];
  if (searchAll || requestedArea === "content") {
    jobs.push(addGroup("content", searchPosts("blog", searchTerm, query, page, "article")));
  }
  if (searchAll || requestedArea === "community") {
    jobs.push((async () => {
      const [topics, commentResults] = await Promise.all([
        searchPosts("forum", searchTerm, query, page, "community_topic"),
        searchCommunityComments(searchTerm, query, page),
      ]);
      await addGroup("community", Promise.resolve([...topics, ...commentResults]));
    })());
  }
  if (searchAll || requestedArea === "news") {
    jobs.push(addGroup("news", searchPosts("news", searchTerm, query, page, "update")));
  }
  if (searchAll || requestedArea === "tutorials") {
    jobs.push(addGroup("tutorials", searchPosts("help", searchTerm, query, page, "tutorial")));
  }
  if (searchAll || requestedArea === "roadmap") {
    jobs.push(addGroup("roadmap", searchRoadmap(searchTerm, query, page)));
  }
  if ((searchAll || requestedArea === "private") && viewerUserId !== null) {
    jobs.push(addGroup("private", searchPrivateItems(viewerUserId, searchTerm, query, page)));
  }
  await Promise.all(jobs);
  const areaOrder: SearchArea[] = ["content", "community", "news", "tutorials", "roadmap", "private"];
  groups.sort((left, right) => areaOrder.indexOf(left.area) - areaOrder.indexOf(right.area));

  res.setHeader("Cache-Control", "private, no-store");
  res.json(SearchPortalResponse.parse({ query, page, groups }));
});

export default router;
