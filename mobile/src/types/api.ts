


export type HealthResponse = {
  status: string;
};


export type MeResponse = {
  id: string;
  displayName: string;
  email: string;

  handle: string | null;

  suggestedHandle: string;

  avatarUrl: string | null;
  bio: string | null;
  goals: string[];
  interests: string[];
  country: string | null;
  preferredCurrency: string | null;
  homeCity: string | null;
  onboardingCompleted: boolean;
};


export type UpdateProfileRequest = {
  handle?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  goals?: string[];
  interests?: string[];
  country?: string;
  preferredCurrency?: string;
  homeCity?: string;
};


export type HandleAvailabilityResponse = {
  handle: string;
  available: boolean;

  status: 'FREE' | 'MALFORMED' | 'RESERVED' | 'TAKEN';
};


export type VerificationCodeResponse = {
  expiresAt: string;

  resendAvailableAt: string;
};


export type VerificationResultResponse = {
  verified: boolean;
};


export type ItineraryResponse = {
  id: string;
  title: string;
  destinations: string[];

  description: string | null;

  startDate: string | null;
  endDate: string | null;
  state: string;
  visibility: string;

  archived: boolean;

  lastEditedBy: string | null;
  lastEditedAt: string | null;

  days: DayResponse[];
  createdAt: string;
};


export type DayResponse = {
  id: string;
  ordinal: number;

  title: string | null;

  activities: ActivityResponse[];
};


export type ActivityResponse = {
  id: string;
  sortOrder: number;
  title: string;
  timeOfDay: string | null;
  costAmount: string | null;
  costCurrency: string | null;
  place: string | null;
  description: string | null;
  notes: string | null;
  externalUrl: string | null;
  lastEditedBy: string;
  lastEditedAt: string;
};


export type CreateItineraryRequest = {
  title: string;
  destinations: string[];
  description?: string;
  startDate?: string;
  endDate?: string;
  durationDays?: number;
};


export type UpdateItineraryRequest = {
  title: string;
  destinations: string[];
  description?: string;
  startDate?: string;
  endDate?: string;
};


export type DayRequest = {
  title?: string;
};


export type ActivityRequest = {
  title: string;
  timeOfDay?: string;
  costAmount?: string;
  costCurrency?: string;
  place?: string;
  description?: string;
  notes?: string;
  externalUrl?: string;
};


export type ReorderActivitiesRequest = {
  activityIds: string[];
};


export type MoveActivityRequest = {
  targetDayId: string;
};


export type EditLeaseResponse = {
  itineraryId: string;
  holderId: string;

  expiresAt: string;
};


export type Page<T> = {
  items: T[];
  nextCursor?: string;
};


export type ErrorEnvelope = {
  code: string;
  message: string;
  traceId: string;
  timestamp: string;
};


export type CreateInvitationRequest = {
  email: string;
};


export type InvitationResponse = {
  id: string;
  email: string;
  createdAt: string;
  expiresAt: string;
};


export type InboxInvitationResponse = {
  id: string;
  itineraryId: string;
  tripTitle: string;
  inviterName: string;
  createdAt: string;
  expiresAt: string;
};


export type MemberResponse = {
  travelerId: string;
  displayName: string;
  role: string;
  joinedAt: string;

  ownershipOffered?: boolean;
};


export type OwnershipOfferRequest = {
  travelerId: string;
};


export type AcceptResponse = {
  itineraryId: string;
};
