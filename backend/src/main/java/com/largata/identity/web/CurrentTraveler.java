package com.largata.identity.web;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Binds the authenticated caller's domain {@code Traveler} to a controller parameter, provisioning
 * it on first contact.
 *
 * <p>Declaring the parameter is the whole mechanism: there is no "get the current traveler" call
 * for a handler to forget, and no endpoint can see a Firebase UID without the Traveler behind it
 * existing. The same shape as Artifact 03's guard — the object you need can only come from the one
 * thing that establishes it.
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface CurrentTraveler {}
