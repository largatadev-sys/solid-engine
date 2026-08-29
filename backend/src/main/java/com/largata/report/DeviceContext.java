package com.largata.report;


public record DeviceContext(String os, String browser, String deviceModel) {

    public static final int MAX_CHARS = 200;

    public static final DeviceContext NONE = new DeviceContext(null, null, null);

    public DeviceContext clamped() {
        return new DeviceContext(bounded(os), bounded(browser), bounded(deviceModel));
    }


    private static String bounded(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.length() > MAX_CHARS ? trimmed.substring(0, MAX_CHARS) : trimmed;
    }
}
