import { ApiError } from '../src/api/ApiError';
import { REMOVAL_FAILED_TOAST } from '../src/removal/removalCopy';
import { failureToast } from '../src/removal/removalFailure';


function refusal(code: string, status: number): ApiError {
  return new ApiError({ code, message: 'refused', status });
}


describe('a removal that the server has already performed is a quiet no-op', () => {
  it('says nothing when a repeat archive lands on the named state-transition refusal', () => {
    expect(failureToast(refusal('ILLEGAL_STATE_TRANSITION', 409))).toBeNull();
  });

  it('says nothing when the subject is already gone', () => {
    expect(failureToast(refusal('ITINERARY_NOT_FOUND', 404))).toBeNull();
  });
});


describe('a removal that genuinely failed tells the traveler', () => {
  it('surfaces the failure when the server refuses on authority', () => {
    expect(failureToast(refusal('NOT_PERMITTED', 403))).toBe(REMOVAL_FAILED_TOAST);
  });

  it('surfaces the failure when the network never answered', () => {
    expect(failureToast(ApiError.offline())).toBe(REMOVAL_FAILED_TOAST);
  });

  it('surfaces the failure for a cause that is not an ApiError at all', () => {
    expect(failureToast(new TypeError('undefined is not a function'))).toBe(REMOVAL_FAILED_TOAST);
  });

  it('never lets a thrown non-error pass silently', () => {
    expect(failureToast('something went wrong')).toBe(REMOVAL_FAILED_TOAST);
  });
});
