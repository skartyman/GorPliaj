import { browser } from '$app/environment';
import { writable } from 'svelte/store';

export type CartState = Record<string, { quantity: number }>;

const CART_STORAGE_KEY = 'gorpliaj-menu-cart';

function loadCart(): CartState {
  if (!browser) return {};

  try {
    const value = window.localStorage.getItem(CART_STORAGE_KEY);
    const parsed = value ? JSON.parse(value) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function persistCart(state: CartState) {
  if (!browser) return;
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
}

function createCartStore() {
  const { subscribe, set, update } = writable<CartState>(loadCart());

  return {
    subscribe,
    hydrate() {
      set(loadCart());
    },
    updateQuantity(itemId: number, delta: number) {
      update((state) => {
        const key = String(itemId);
        const current = Number(state[key]?.quantity || 0);
        const nextQty = Math.max(0, current + delta);
        const nextState = { ...state };

        if (nextQty === 0) {
          delete nextState[key];
        } else {
          nextState[key] = { quantity: nextQty };
        }

        persistCart(nextState);
        return nextState;
      });
    },
    clear() {
      const nextState: CartState = {};
      persistCart(nextState);
      set(nextState);
    }
  };
}

export const cartStore = createCartStore();
