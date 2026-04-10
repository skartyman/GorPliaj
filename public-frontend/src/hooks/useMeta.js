import { useEffect } from 'react';

export function useMeta(title, description) {
  useEffect(() => {
    if (title) {
      document.title = title;
    }

    if (description) {
      let node = document.querySelector('meta[name="description"]');
      if (!node) {
        node = document.createElement('meta');
        node.setAttribute('name', 'description');
        document.head.appendChild(node);
      }
      node.setAttribute('content', description);
    }
  }, [title, description]);
}
