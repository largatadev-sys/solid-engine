package com.largata.identity.web;

import com.largata.identity.Traveler;
import com.largata.identity.api.MeResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The authenticated traveler's own record.
 *
 * <p>Note what is absent: no provisioning call, no null check, no "create if missing". Declaring
 * the {@link CurrentTraveler} parameter is what provisions — by the time this method body runs, the
 * Traveler exists, because the only way to obtain that argument is through the resolver that
 * ensures it. Every authenticated endpoint from S0.3 on inherits the same guarantee for free.
 */
@RestController
@RequestMapping("/v1/me")
class MeController {

    @GetMapping
    MeResponse me(@CurrentTraveler Traveler traveler) {
        return MeResponse.of(traveler);
    }
}
