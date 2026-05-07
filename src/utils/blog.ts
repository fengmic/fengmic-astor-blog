import type { CollectionEntry } from 'astro:content';

export type BlogPost = CollectionEntry<'posts'>;

export function getPostSlug(post: BlogPost) {
  return post.id.replace(/\.(md|mdx)$/i, '');
}

export function sortPostsByDate(posts: BlogPost[]) {
  return [...posts].sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export function getAllTags(posts: BlogPost[]) {
  const tagCount = new Map<string, number>();

  for (const post of posts) {
    for (const tag of post.data.tags) {
      tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
    }
  }

  return [...tagCount.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

export function getTopTags(posts: BlogPost[], limit = 9) {
  return getAllTags(posts)
    .slice(0, limit)
    .map((item) => item.tag);
}

export function paginatePosts(posts: BlogPost[], pageSize: number, page: number) {
  const totalPages = Math.max(1, Math.ceil(posts.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;

  return {
    currentPage,
    totalPages,
    posts: posts.slice(startIndex, startIndex + pageSize),
  };
}
