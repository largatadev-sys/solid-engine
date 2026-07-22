package com.largata.identity.web;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Binds the authenticated caller's {@link VerifiedContact} — their token's email and verification
 * status — to a controller parameter (S1.2).
 *
 * <p>The counterpart to {@link CurrentTraveler}: that one resolves the domain identity (and
 * provisions it), this one exposes the live email claims the invitation accept gate checks. A handler
 * declares whichever it needs; accept needs both (the traveler id to create the membership, the
 * verified email to authorise it).
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface AuthEmail {}
