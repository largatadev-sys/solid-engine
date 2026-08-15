package com.largata.itinerary;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;


public record EstimatedCost(BigDecimal amount, String currency, boolean partial) {


    public static Optional<EstimatedCost> derivedFrom(List<DayView> plan) {
        List<ActivityView> all = plan.stream().flatMap(day -> day.activities().stream()).toList();
        List<ActivityView> priced = all.stream().filter(activity -> activity.costAmount() != null).toList();

        List<ActivityView> counted =
                priced.stream().filter(activity -> activity.costAmount().signum() != 0).toList();
        if (counted.isEmpty()) {
            return Optional.empty();
        }

        Set<String> currencies =
                counted.stream().map(EstimatedCost::normalize).collect(Collectors.toCollection(HashSet::new));
        if (currencies.size() != 1) {
            return Optional.empty();
        }

        BigDecimal total =
                priced.stream().map(ActivityView::costAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        return Optional.of(
                new EstimatedCost(total, currencies.iterator().next(), priced.size() != all.size()));
    }


    private static String normalize(ActivityView activity) {
        String currency = activity.costCurrency();
        return currency == null || currency.isBlank() ? null : currency.strip().toUpperCase(Locale.ROOT);
    }
}
