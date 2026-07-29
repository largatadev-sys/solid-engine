package com.largata.workspace;


public enum WorkspaceState {
    ACTIVE,
    COMPLETED,
    ARCHIVED;


    public boolean isArchived() {
        return this == ARCHIVED;
    }
}
