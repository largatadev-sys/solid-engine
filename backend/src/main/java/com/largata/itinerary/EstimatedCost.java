package com.largata.itinerary;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;


public record EstimatedCost(BigDecimal amount, String currency) {


    public static EstimatedCost of(List<DayView> plan) {
        List<ActivityView> priced =
                plan.stream()
                        .flatMap(day -> day.activities().stream())
                        .filter(activity -> activity.costAmount() != null)
                        .toList();

        List<ActivityView> counted =
                priced.stream().filter(activity -> activity.costAmount().signum() != 0).toList();
        if (counted.isEmpty()) {
            return null;
        }

        Set<String> currencies =
                counted.stream().map(EstimatedCost::normalize).collect(Collectors.toCollection(HashSet::new));
        if (currencies.size() != 1) {
            return null;
        }

        BigDecimal total =
                priced.stream().map(ActivityView::costAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new EstimatedCost(total, currencies.iterator().next());
    }


    private static String normalize(ActivityView activity) {
        String currency = activity.costCurrency();
        return currency == null || currency.isBlank() ? null : currency.strip().toUpperCase(Locale.ROOT);
    }
}
