import { readFileSync } from 'fs';
import { join } from 'path';
import { ACCEPT_FAILED } from '../src/members/travelerCopy';


const card = readFileSync(join(__dirname, '..', 'src', 'components', 'RequestsList.tsx'), 'utf8');


describe('a failed accept says so', () => {
  it('SURFACES the error rather than swallowing it — the quarantine ledger named this exact gap', () => {
    expect(card).toContain('setAcceptFailed(true)');
    expect(card).toContain('{ACCEPT_FAILED}');
  });

  it('keeps the unverified-email refusal on its own path, with its own copy', () => {
    expect(card).toContain("error.code === 'EMAIL_NOT_VERIFIED'");
    expect(card).toContain('router.push(VERIFY_CODE_ROUTE)');
  });

  it('clears the failure on a retry, so the card does not carry a stale complaint', () => {
    expect(card).toContain('setAcceptFailed(false)');
  });

  it('names the retry in the copy, because the card stays and the button still works', () => {
    expect(ACCEPT_FAILED).toMatch(/again/i);
  });
});
