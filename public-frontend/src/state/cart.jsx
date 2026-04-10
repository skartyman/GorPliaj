import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'gorpliaj-menu-cart';
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setItems(JSON.parse(raw));
      }
    } catch {}
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      updateQuantity: (itemId, delta) => {
        setItems((current) => {
          const key = String(itemId);
          const quantity = Math.max(0, Number(current[key]?.quantity || 0) + delta);
          if (!quantity) {
            const next = { ...current };
            delete next[key];
            return next;
          }
          return { ...current, [key]: { quantity } };
        });
      },
      clear: () => setItems({})
    }),
    [items]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
