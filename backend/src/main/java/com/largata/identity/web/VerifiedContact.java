package com.largata.identity.web;

/**
 * The authenticated caller's email and whether the token asserts it is verified (S1.2).
 *
 * <p><strong>Read from the live token, not the {@code Traveler} snapshot.</strong> A Traveler's email
 * is a snapshot taken at provisioning (S0.2, decision 6d); the invitation accept gate needs the
 * token's <em>current</em> assertion — the {@code email} and {@code email_verified} claims Firebase
 * signs on every issue — because verification can happen after provisioning and the snapshot would
 * not know. Bound to a controller parameter with {@link AuthEmail}, resolved by {@link
 * AuthEmailArgumentResolver}.
 *
 * @param email the token's {@code email} claim (may be null if a token somehow lacks one)
 * @param verified the token's {@code email_verified} claim — false unless the claim is explicitly true
 */
public record VerifiedContact(String email, boolean verified) {}
