package com.largata.common.api;

import java.util.List;
import java.util.function.Function;


public record Page<T>(List<T> items, String nextCursor) {

    public static <T> Page<T> exhausted(List<T> items) {
        return new Page<>(items, null);
    }

    public static <T> Page<T> of(List<T> items, String nextCursor) {
        return new Page<>(items, nextCursor);
    }


    public <R> Page<R> map(Function<T, R> mapper) {
        return new Page<>(items.stream().map(mapper).toList(), nextCursor);
    }
}
