import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

const BLOG_CONTENT_DIR = path.join(process.cwd(), 'src/content/blog');

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
}

export interface BlogPost extends BlogPostMeta {
  contentHtml: string;
}

/** Return all blog post metadata sorted by date descending */
export function getAllBlogPosts(): BlogPostMeta[] {
  const fileNames = fs.readdirSync(BLOG_CONTENT_DIR).filter((f) => f.endsWith('.md'));

  const posts = fileNames.map((fileName) => {
    const filePath = path.join(BLOG_CONTENT_DIR, fileName);
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const { data } = matter(fileContents);

    return {
      slug: data.slug as string,
      title: data.title as string,
      description: data.description as string,
      date: data.date as string,
      category: data.category as string,
    };
  });

  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Return all slugs for static path generation */
export function getAllBlogSlugs(): string[] {
  return getAllBlogPosts().map((p) => p.slug);
}

/** Return a single blog post with rendered HTML content */
export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const fileNames = fs.readdirSync(BLOG_CONTENT_DIR).filter((f) => f.endsWith('.md'));

  for (const fileName of fileNames) {
    const filePath = path.join(BLOG_CONTENT_DIR, fileName);
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContents);

    if (data.slug !== slug) continue;

    const processed = await remark().use(html, { sanitize: false }).process(content);
    const contentHtml = processed.toString();

    return {
      slug: data.slug as string,
      title: data.title as string,
      description: data.description as string,
      date: data.date as string,
      category: data.category as string,
      contentHtml,
    };
  }

  return null;
}
