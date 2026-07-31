package com.largata.workspace;


public enum WorkspaceState {
    ACTIVE,
    COMPLETED,
    ARCHIVED;


    public boolean isArchived() {
        return this == ARCHIVED;
    }


    public String wireName() {
        return name().toLowerCase(java.util.Locale.ROOT);
    }
}
