import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { sortPostsByDate, getPostSlug } from '../utils/blog.ts';

export async function GET(context) {
  const posts = sortPostsByDate(await getCollection('posts'));

  return rss({
    title: '楓念的博客',
    description: '记录代码、技术与二次元生活',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.excerpt,
      link: `/post/${getPostSlug(post)}/`,
      categories: post.data.tags,
      author: post.data.author
    })),
    customData: '<language>zh-CN</language>'
  });
}
