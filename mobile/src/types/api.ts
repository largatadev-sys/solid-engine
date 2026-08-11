


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

  vanityNumber: string | null;
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


export type ItineraryState = 'draft' | 'upcoming' | 'ongoing' | 'completed';


export type Visibility = 'public' | 'private';


export type TripCategory = 'draft' | 'upcoming' | 'ongoing' | 'complete';


export type PublishAudience = Visibility;


export type ItineraryResponse = {
  id: string;
  title: string;
  destinations: string[];

  description: string | null;

  standouts: string[];

  bestTimeOfYear: string | null;

  coverImageUrl: string | null;

  startDate: string | null;
  endDate: string | null;
  state: ItineraryState;
  published: boolean;
  visibility: Visibility;

  archived: boolean;

  beingEdited?: boolean;

  workspaceState?: 'active' | 'completed' | 'archived';

  lastEditedBy: string | null;
  lastEditedAt: string | null;

  lastEditedByHandle?: string | null;
  lastEditedByName?: string | null;

  lease?: LeaseHolderResponse | null;

  editingSession?: LeaseHolderResponse | null;

  days: DayResponse[];
  createdAt: string;

  planVersion?: number;
};


export type SavePlanRequest = {
  basePlanVersion: number;

  days: Array<{
    id: string | null;
    title: string | null;
    activities: Array<{ id: string | null; fields: ActivityRequest }>;
  }>;
};


export type LeaseHolderResponse = {
  travelerId: string;
  handle: string | null;
  displayName: string | null;
  avatarUrl: string | null;

  expiresAt: string;
};


export type DayResponse = {
  id: string;
  ordinal: number;

  title: string | null;

  activities: ActivityResponse[];

  lease?: LeaseHolderResponse | null;
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
  bookingPurpose: string | null;
  bookingProvider: string | null;
  bookingPriceAmount: string | null;
  bookingPriceCurrency: string | null;
  lastEditedBy: string;
  lastEditedAt: string;

  lastEditedByHandle?: string | null;
  lastEditedByName?: string | null;

  lease?: LeaseHolderResponse | null;

  photos: ActivityPhotoResponse[];
};


export type ActivityPhotoResponse = {
  id: string;
  url: string;
  thumbUrl: string;
};


export type PhotoDumpEntryResponse = {
  id: string;
  url: string;
  thumbUrl: string;
  uploadedBy: string;
  createdAt: string;
};


export type EstimatedCostResponse = {
  amount: string;

  currency: string | null;
};


export type PublishedActivityResponse = {
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
  bookingPurpose: string | null;
  bookingProvider: string | null;
  bookingPriceAmount: string | null;
  bookingPriceCurrency: string | null;

  photos: ActivityPhotoResponse[];
};


export type PublishedDayResponse = {
  id: string;
  ordinal: number;
  title: string | null;
  activities: PublishedActivityResponse[];
};


export type PublishedItineraryResponse = {
  id: string;
  title: string;
  destinations: string[];
  description: string | null;

  standouts: string[];
  bestTimeOfYear: string | null;
  coverImageUrl: string | null;

  durationDays: number;

  creator: TravelerCardResponse;

  estimatedCost: EstimatedCostResponse | null;
  days: PublishedDayResponse[];
};


export type CreateItineraryRequest = {
  title: string;
  destinations: string[];
  description?: string;
  startDate?: string;
  endDate?: string;
  durationDays?: number;
  standouts?: string[];
  bestTimeOfYear?: string;
};


export type UpdateItineraryRequest = {
  title: string;
  destinations: string[];
  description?: string;

  standouts?: string[];

  bestTimeOfYear?: string;
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
  bookingPurpose?: string;
  bookingProvider?: string;
  bookingPriceAmount?: string;
  bookingPriceCurrency?: string;
};


export type ReorderActivitiesRequest = {
  activityIds: string[];

  expectedActivityIds: string[];
};


export type MoveActivityRequest = {
  targetDayId: string;
};


export type LeaseSubjectType = 'header' | 'day' | 'activity' | 'session';


export type LeaseSubject = {
  subjectType: LeaseSubjectType;

  subjectId?: string;
};


export type EditLeaseResponse = {
  itineraryId: string;
  subjectType: LeaseSubjectType;
  subjectId: string;
  holderId: string;

  expiresAt: string;
};


export type Page<T> = {
  items: T[];
  nextCursor?: string;
};


export type DiaryPhotoResponse = {
  id: string;
  url: string;
  thumbUrl: string;
};


export type DiaryEntryResponse = {
  id: string;
  itineraryId: string;
  activityId: string | null;
  activityTitle: string;
  dayLabel: string;
  timeOfDay: string | null;
  caption: string | null;
  photos: DiaryPhotoResponse[];
  createdAt: string;
  updatedAt: string;
};


export type DiaryTripResponse = {
  itineraryId: string;
  title: string | null;
  entryCount: number;
};


export type PostDiaryEntryRequest = {
  activityId: string;
  caption: string | null;
  fromDump: string[];
};


export type ErrorEnvelope = {
  code: string;
  message: string;
  traceId: string;
  timestamp: string;

  details?: Record<string, unknown>;
};


export type CreateInvitationRequest = {
  email: string;
};


export type InviteByHandleRequest = {
  handle: string;
};


export type TravelerCardResponse = {
  id: string;
  handle: string | null;
  displayName: string;
  avatarUrl: string | null;
};


export type InvitationResponse = {
  id: string;
  email: string | null;

  inviteeTravelerId: string | null;
  inviteeHandle: string | null;

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
  avatarUrl: string | null;
  role: string;
  joinedAt: string;

  ownershipOffered?: boolean;

  handle?: string | null;
  bio?: string | null;
  vanityNumber?: string | null;
};


export type OwnershipOfferRequest = {
  travelerId: string;
};


export type AcceptResponse = {
  itineraryId: string;
};
