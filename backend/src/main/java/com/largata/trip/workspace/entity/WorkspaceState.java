package com.largata.trip.workspace.entity;


public enum WorkspaceState {
    ACTIVE,
    ARCHIVED;


    public boolean isArchived() {
        return this == ARCHIVED;
    }


    public boolean isOpen() {
        return this == ACTIVE;
    }
}
