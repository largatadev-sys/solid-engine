package com.largata.media;


public record IngestedImage(
        byte[] display, byte[] thumbnail, String contentType, int width, int height) {}
