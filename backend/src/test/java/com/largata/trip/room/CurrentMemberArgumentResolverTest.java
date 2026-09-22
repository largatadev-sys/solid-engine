package com.largata.trip.room;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.lang.reflect.Method;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.ServletWebRequest;


class CurrentMemberArgumentResolverTest {

    private final CurrentMemberArgumentResolver resolver = new CurrentMemberArgumentResolver();


    static final class Handlers {
        void takesTheMember(@CurrentMember Membership member) {}

        void takesAnUnannotatedMembership(Membership member) {}

        void takesSomethingElse(@CurrentMember String notAMembership) {}
    }


    @Test
    void supportsOnlyAnAnnotatedMembershipParameter() {
        assertThat(resolver.supportsParameter(parameterOf("takesTheMember", Membership.class))).isTrue();
        assertThat(resolver.supportsParameter(parameterOf("takesAnUnannotatedMembership", Membership.class))).isFalse();
        assertThat(resolver.supportsParameter(parameterOf("takesSomethingElse", String.class))).isFalse();
    }


    @Test
    void handsOverWhatTheThresholdStored() {
        Membership stored = new Membership(UUID.randomUUID(), UUID.randomUUID(), Role.MEMBER);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/v1/trips/" + stored.itineraryId());
        request.setAttribute(WorkspaceThreshold.MEMBERSHIP_ATTRIBUTE, stored);

        Object resolved =
                resolver.resolveArgument(
                        parameterOf("takesTheMember", Membership.class), null, new ServletWebRequest(request), null);

        assertThat(resolved).isEqualTo(stored);
    }


    @Test
    void refusesLoudlyWhenTheThresholdNeverRan() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/v1/somewhere-else");

        assertThatThrownBy(
                        () ->
                                resolver.resolveArgument(
                                        parameterOf("takesTheMember", Membership.class),
                                        null,
                                        new ServletWebRequest(request),
                                        null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("takesTheMember");
    }


    private static MethodParameter parameterOf(String handler, Class<?> type) {
        try {
            Method method = Handlers.class.getDeclaredMethod(handler, type);
            return new MethodParameter(method, 0);
        } catch (NoSuchMethodException e) {
            throw new IllegalStateException(e);
        }
    }
}
