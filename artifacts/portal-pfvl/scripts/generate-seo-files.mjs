import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const publicDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../public',
);
const configuredSiteUrl = process.env.VITE_SITE_URL?.trim();

if (!configuredSiteUrl) {
  console.info('VITE_SITE_URL is not set; leaving the sitemap for deployment.');
  process.exit(0);
}

const siteUrl = new URL(configuredSiteUrl);
if (!['https:', 'http:'].includes(siteUrl.protocol)) {
  throw new Error('VITE_SITE_URL must use HTTP or HTTPS.');
}

const origin = siteUrl.origin;
const routes = [
  { path: '/', changeFrequency: 'weekly', priority: '1.0' },
  { path: '/community', changeFrequency: 'daily', priority: '0.8' },
  { path: '/blog', changeFrequency: 'weekly', priority: '0.8' },
  { path: '/news', changeFrequency: 'weekly', priority: '0.7' },
  { path: '/indicators', changeFrequency: 'daily', priority: '0.8' },
  { path: '/suggestions', changeFrequency: 'weekly', priority: '0.6' },
  { path: '/help', changeFrequency: 'monthly', priority: '0.5' },
];

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...routes.flatMap(({ path: route, changeFrequency, priority }) => [
    '  <url>',
    `    <loc>${origin}${route}</loc>`,
    `    <changefreq>${changeFrequency}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ]),
  '</urlset>',
  '',
].join('\n');

await Promise.all([
  writeFile(path.join(publicDirectory, 'sitemap.xml'), sitemap),
  writeFile(
    path.join(publicDirectory, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`,
  ),
]);

console.info(`Generated sitemap and robots.txt for ${origin}.`);
