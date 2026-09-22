package com.largata.trip.room;

import org.springframework.core.MethodParameter;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;


final class CurrentMemberArgumentResolver implements HandlerMethodArgumentResolver {

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(CurrentMember.class)
                && Membership.class.isAssignableFrom(parameter.getParameterType());
    }

    @Override
    public Object resolveArgument(
            MethodParameter parameter,
            ModelAndViewContainer mavContainer,
            NativeWebRequest webRequest,
            WebDataBinderFactory binderFactory) {
        Object member =
                webRequest.getAttribute(WorkspaceThreshold.MEMBERSHIP_ATTRIBUTE, RequestAttributes.SCOPE_REQUEST);
        if (!(member instanceof Membership membership)) {
            throw new IllegalStateException(
                    "@CurrentMember on a handler the threshold never reached — the route does not name a trip: "
                            + parameter.getMethod());
        }
        return membership;
    }
}
