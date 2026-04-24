import { defineCollection, z } from 'astro:content';

const postsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    excerpt: z.string().default(''),
    author: z.string().default('Anonymous')
  })
});

export const collections = {
  posts: postsCollection
};
