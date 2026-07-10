// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// 塊頭勇者 Blockyusha 官網 — 靜態輸出(SEO)，部署到 GitHub Pages(blockyusha.com)
export default defineConfig({
  site: 'https://blockyusha.com',
  integrations: [sitemap()],
  // output:'static' 為預設；angle brackets/emoji 保留原樣
  build: { format: 'directory' }, // /dex/c15/index.html → 乾淨網址 /dex/c15/
});
