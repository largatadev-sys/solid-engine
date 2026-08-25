import type { SocketFrame } from './frameDispatch';

export type EventListener = (frame: Extract<SocketFrame, { kind: 'event' }>) => void;

export type ReconnectListener = () => void;

type Entry = { onEvent: EventListener; onReconnect?: ReconnectListener };

const TRAVELER_PREFIX = 'traveler:';

const TRIPS_SUFFIX = ':trips';

function isTripsTopic(topic: string): boolean {
  return topic.startsWith('itinerary:') && topic.endsWith(TRIPS_SUFFIX);
}

export class SubscriptionLedger {
  private readonly entries = new Map<string, Entry[]>();

  add(topic: string, onEvent: EventListener, onReconnect?: ReconnectListener): boolean {
    const held = this.entries.get(topic);
    if (held === undefined) {
      this.entries.set(topic, [{ onEvent, onReconnect }]);
      return true;
    }
    held.push({ onEvent, onReconnect });
    return false;
  }

  remove(topic: string, onEvent: EventListener): boolean {
    const held = this.entries.get(topic);
    if (held === undefined) return false;

    const index = held.findIndex((entry) => entry.onEvent === onEvent);
    if (index === -1) return false;

    held.splice(index, 1);
    if (held.length > 0) return false;

    this.entries.delete(topic);
    return true;
  }

  topics(): string[] {
    return [...this.entries.keys()];
  }

  deliver(topic: string, frame: Extract<SocketFrame, { kind: 'event' }>): void {
    const reached = new Set<EventListener>();
    for (const entry of this.entries.get(topic) ?? []) {
      reached.add(entry.onEvent);
      try {
        entry.onEvent(frame);
      } catch {
        continue;
      }
    }
    if (!isTripsTopic(topic)) return;

    for (const held of this.travelerEntries()) {
      if (reached.has(held.onEvent)) continue;
      try {
        held.onEvent(frame);
      } catch {
        continue;
      }
    }
  }

  private travelerEntries(): Entry[] {
    return [...this.entries.entries()]
      .filter(([topic]) => topic.startsWith(TRAVELER_PREFIX))
      .flatMap(([, held]) => held);
  }

  announceReconnect(): void {
    for (const held of this.entries.values()) {
      for (const entry of held) {
        try {
          entry.onReconnect?.();
        } catch {
          continue;
        }
      }
    }
  }
}
