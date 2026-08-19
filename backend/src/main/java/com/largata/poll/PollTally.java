package com.largata.poll;

import java.util.List;
import java.util.Map;
import java.util.UUID;


final class PollTally {

    private PollTally() {}


    static List<UUID> winnersAmong(List<UUID> optionIds, Map<UUID, Long> countsByOption) {
        long leading = optionIds.stream().mapToLong(id -> countFor(countsByOption, id)).max().orElse(0L);
        if (leading == 0L) {
            return List.of();
        }
        return optionIds.stream().filter(id -> countFor(countsByOption, id) == leading).toList();
    }


    static long countFor(Map<UUID, Long> countsByOption, UUID optionId) {
        return countsByOption.getOrDefault(optionId, 0L);
    }
}
