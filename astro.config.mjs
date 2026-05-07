import { defineConfig } from 'astro/config';

function rehypeImagePerformance() {
  return (tree) => {
    function walk(node) {
      if (!node || typeof node !== 'object') return;

      if (node.type === 'element' && node.tagName === 'img') {
        node.properties = node.properties || {};
        if (!('loading' in node.properties)) node.properties.loading = 'lazy';
        if (!('decoding' in node.properties)) node.properties.decoding = 'async';
      }

      if (Array.isArray(node.children)) {
        node.children.forEach(walk);
      }
    }

    walk(tree);
  };
}

export default defineConfig({
  site: 'https://fengmic.pages.dev/',
  output: 'static',
  markdown: {
    shikiConfig: {
      theme: 'github-light'
    },
    rehypePlugins: [rehypeImagePerformance]
  }
});
