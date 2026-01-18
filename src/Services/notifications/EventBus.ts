type EventHandler = (payload?: any) => void;

const listeners: Record<string, EventHandler[]> = {};

export const EventBus = {
  on(event: string, handler: EventHandler) {
    listeners[event] = listeners[event] || [];
    listeners[event].push(handler);
    return () => {
      listeners[event] = listeners[event].filter(h => h !== handler);
    };
  },

  emit(event: string, payload?: any) {
    listeners[event]?.forEach(handler => handler(payload));
  },
};
