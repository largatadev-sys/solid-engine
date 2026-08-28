package com.largata.media;


public record SanitizedImage(byte[] bytes, String contentType, int width, int height) {}
