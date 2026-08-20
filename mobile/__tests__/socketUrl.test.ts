import { socketUrlFrom } from '../src/ws/socketUrl';

describe('socketUrlFrom', () => {
  it('derives ws from http so no second baked variable is needed', () => {
    expect(socketUrlFrom('http://localhost:8080', 'abc')).toBe('ws://localhost:8080/ws?ticket=abc');
  });

  it('derives wss from https so a deployed rung upgrades with the page', () => {
    expect(socketUrlFrom('https://api-dev.largata.com', 'abc')).toBe(
      'wss://api-dev.largata.com/ws?ticket=abc',
    );
  });

  it('keeps the emulator host-loopback alias intact', () => {
    expect(socketUrlFrom('http://10.0.2.2:8080', 'tkt')).toBe('ws://10.0.2.2:8080/ws?ticket=tkt');
  });

  it('does not mangle a base url that already ends in a slash', () => {
    expect(socketUrlFrom('http://localhost:8080/', 'abc')).toBe('ws://localhost:8080/ws?ticket=abc');
  });

  it('percent-encodes the ticket so a url-unsafe value cannot break the query', () => {
    expect(socketUrlFrom('http://localhost:8080', 'a+b/c=d')).toBe(
      'ws://localhost:8080/ws?ticket=a%2Bb%2Fc%3Dd',
    );
  });

  it('leaves an already-ws base url alone rather than double-rewriting it', () => {
    expect(socketUrlFrom('ws://localhost:8080', 'abc')).toBe('ws://localhost:8080/ws?ticket=abc');
  });
});
