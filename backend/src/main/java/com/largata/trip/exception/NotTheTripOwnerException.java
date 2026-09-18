package com.largata.trip.exception;

import com.largata.common.error.ForbiddenException;

public final class NotTheTripOwnerException extends ForbiddenException {

    public NotTheTripOwnerException(String message) {
        super("NOT_PERMITTED", message);
    }


    public static NotTheTripOwnerException toStartOrCompleteTheTrip() {
        return new NotTheTripOwnerException("Only the trip owner can start or complete this trip.");
    }


    public static NotTheTripOwnerException toRemoveAMember() {
        return new NotTheTripOwnerException("Only the trip owner can remove a member.");
    }


    public static NotTheTripOwnerException toChangeArchiveState() {
        return new NotTheTripOwnerException(
                "Only the trip owner can archive or unarchive this trip.");
    }


    public static NotTheTripOwnerException toOfferOwnership() {
        return new NotTheTripOwnerException(
                "Only the trip owner can offer ownership of this trip.");
    }


    public static NotTheTripOwnerException toRevokeAnOffer() {
        return new NotTheTripOwnerException("Only the trip owner can revoke an ownership offer.");
    }


    public static NotTheTripOwnerException toEditTheTripsDetails() {
        return new NotTheTripOwnerException("Only the trip owner can edit the trip's details.");
    }


    public static NotTheTripOwnerException toAddOrRemoveDays() {
        return new NotTheTripOwnerException("Only the trip owner can add or remove days.");
    }


    public static NotTheTripOwnerException toDeleteTheTrip() {
        return new NotTheTripOwnerException("Only the trip owner can delete this trip.");
    }


    public static NotTheTripOwnerException toPublishTheTrip() {
        return new NotTheTripOwnerException("Only the trip owner can publish this trip.");
    }


    public static NotTheTripOwnerException toUnpublishTheTrip() {
        return new NotTheTripOwnerException("Only the trip owner can unpublish this trip.");
    }


    public static NotTheTripOwnerException toPreviewThePublishedPage() {
        return new NotTheTripOwnerException("Only the trip owner can preview the published page.");
    }


    public static NotTheTripOwnerException toReadTheJoinQueue() {
        return new NotTheTripOwnerException("Only the trip owner can see who has asked to join.");
    }


    public static NotTheTripOwnerException toAnswerAJoinRequest() {
        return new NotTheTripOwnerException(
                "Only the trip owner can approve or decline a request to join.");
    }
}
