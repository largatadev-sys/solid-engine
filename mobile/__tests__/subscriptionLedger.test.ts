import { SubscriptionLedger } from '../src/ws/subscriptionLedger';

const CHAT = 'itinerary:t1:chat';
const ECHO = 'debug:echo';

describe('SubscriptionLedger', () => {
  let ledger: SubscriptionLedger;

  beforeEach(() => {
    ledger = new SubscriptionLedger();
  });

  it('reports a topic as newly wanted the first time it is added', () => {
    expect(ledger.add(CHAT, jest.fn())).toBe(true);
  });

  it('does not re-request a topic a second listener joins', () => {
    ledger.add(CHAT, jest.fn());

    expect(ledger.add(CHAT, jest.fn())).toBe(false);
  });

  it('keeps the topic while any listener remains', () => {
    const first = jest.fn();
    ledger.add(CHAT, first);
    ledger.add(CHAT, jest.fn());

    expect(ledger.remove(CHAT, first)).toBe(false);
    expect(ledger.topics()).toEqual([CHAT]);
  });

  it('reports the topic as droppable when its last listener leaves', () => {
    const only = jest.fn();
    ledger.add(CHAT, only);

    expect(ledger.remove(CHAT, only)).toBe(true);
    expect(ledger.topics()).toEqual([]);
  });

  it('removing a listener that never subscribed changes nothing', () => {
    ledger.add(CHAT, jest.fn());

    expect(ledger.remove(CHAT, jest.fn())).toBe(false);
    expect(ledger.topics()).toEqual([CHAT]);
  });

  it('lists every wanted topic so a reconnect can resubscribe them all', () => {
    ledger.add(CHAT, jest.fn());
    ledger.add(ECHO, jest.fn());

    expect(ledger.topics().sort()).toEqual([ECHO, CHAT].sort());
  });

  it('delivers an event to every listener on its topic', () => {
    const one = jest.fn();
    const two = jest.fn();
    ledger.add(CHAT, one);
    ledger.add(CHAT, two);

    ledger.deliver(CHAT, { kind: 'event', topic: CHAT, type: 't', eventId: 'e', at: 'a', payload: 1 });

    expect(one).toHaveBeenCalledTimes(1);
    expect(two).toHaveBeenCalledTimes(1);
  });

  it('does not deliver an event to listeners on another topic', () => {
    const other = jest.fn();
    ledger.add(ECHO, other);
    ledger.add(CHAT, jest.fn());

    ledger.deliver(CHAT, { kind: 'event', topic: CHAT, type: 't', eventId: 'e', at: 'a', payload: 1 });

    expect(other).not.toHaveBeenCalled();
  });

  it('a listener that throws does not stop the others from being told', () => {
    const exploding = jest.fn(() => {
      throw new Error('subscriber bug');
    });
    const healthy = jest.fn();
    ledger.add(CHAT, exploding);
    ledger.add(CHAT, healthy);

    ledger.deliver(CHAT, { kind: 'event', topic: CHAT, type: 't', eventId: 'e', at: 'a', payload: 1 });

    expect(healthy).toHaveBeenCalledTimes(1);
  });

  it('announces a reconnect to every listener across every topic', () => {
    const chatReconnect = jest.fn();
    const echoReconnect = jest.fn();
    ledger.add(CHAT, jest.fn(), chatReconnect);
    ledger.add(ECHO, jest.fn(), echoReconnect);

    ledger.announceReconnect();

    expect(chatReconnect).toHaveBeenCalledTimes(1);
    expect(echoReconnect).toHaveBeenCalledTimes(1);
  });

  it('a listener with no reconnect handler is simply skipped', () => {
    ledger.add(CHAT, jest.fn());

    expect(() => ledger.announceReconnect()).not.toThrow();
  });

  it('delivering to a topic nobody holds is a no-op rather than an error', () => {
    expect(() =>
      ledger.deliver(CHAT, { kind: 'event', topic: CHAT, type: 't', eventId: 'e', at: 'a', payload: 1 }),
    ).not.toThrow();
  });

  describe('the traveler subject receives what the server fanned in on its behalf', () => {
    const TRAVELER = 'traveler:t1';
    const TRIPS = 'itinerary:trip-9:trips';

    it('delivers a trip frame to a holder of the traveler topic', () => {
      const onEvent = jest.fn();
      ledger.add(TRAVELER, onEvent);

      ledger.deliver(TRIPS, { kind: 'event', topic: TRIPS, type: 't', eventId: 'e', at: 'a', payload: 1 });

      expect(onEvent).toHaveBeenCalledTimes(1);
    });

    it('does not hand a chat frame to the traveler subject, which never asked for one', () => {
      const onEvent = jest.fn();
      ledger.add(TRAVELER, onEvent);

      ledger.deliver(CHAT, { kind: 'event', topic: CHAT, type: 't', eventId: 'e', at: 'a', payload: 1 });

      expect(onEvent).not.toHaveBeenCalled();
    });

    it('still delivers a trip frame to an explicit holder of that exact topic', () => {
      const explicit = jest.fn();
      ledger.add(TRIPS, explicit);

      ledger.deliver(TRIPS, { kind: 'event', topic: TRIPS, type: 't', eventId: 'e', at: 'a', payload: 1 });

      expect(explicit).toHaveBeenCalledTimes(1);
    });

    it('delivers once when a session holds both the traveler subject and the trip topic', () => {
      const onEvent = jest.fn();
      ledger.add(TRAVELER, onEvent);
      ledger.add(TRIPS, onEvent);

      ledger.deliver(TRIPS, { kind: 'event', topic: TRIPS, type: 't', eventId: 'e', at: 'a', payload: 1 });

      expect(onEvent).toHaveBeenCalledTimes(1);
    });
  });
});
