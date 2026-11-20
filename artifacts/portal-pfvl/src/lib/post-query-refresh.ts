import type { QueryClient } from "@tanstack/react-query";
import {
  getGetDashboardQueryKey,
  getGetPostQueryKey,
  getListAdminPostsQueryKey,
  getListCommentsQueryKey,
  getListMyCommunityPostsQueryKey,
  getListPostsQueryKey,
  getSearchPortalQueryKey,
} from "@workspace/api-client-react";

export async function refreshPostQueries(queryClient: QueryClient, postId?: number) {
  const queries = [
    queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getListAdminPostsQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getListMyCommunityPostsQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getSearchPortalQueryKey() }),
  ];

  if (postId !== undefined) {
    queries.push(
      queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(postId) }),
      queryClient.invalidateQueries({ queryKey: getListCommentsQueryKey(postId) }),
    );
  }

  await Promise.all(queries);
}
