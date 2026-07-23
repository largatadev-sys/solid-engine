package com.largata.itinerary.api;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * A trip may not end before it starts — asserted at the API boundary.
 *
 * <p><strong>Why this exists when {@code Itinerary.draft} already enforces the same rule.</strong>
 * The domain factory is the real guarantee: it makes a backwards itinerary unrepresentable for every
 * caller, including ones that do not come through this DTO (S4.7's fork, a future import). But it
 * throws {@code IllegalArgumentException}, which the exception taxonomy correctly reads as a bug —
 * so the traveler gets a 500 for a typo. Found by test, not by inspection.
 *
 * <p>So the same truth is told twice, to two audiences: the domain refuses the state, and this
 * refuses the <em>request</em> with the 400 Artifact 05 requires. Not duplication for its own sake —
 * the alternative (dropping the rule from the factory, or teaching the factory about HTTP) weakens
 * one layer to save a few lines in the other.
 *
 * <p>Only fires when both dates are present: start-only and end-only are legitimate plans (S0.3).
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = ChronologicalDates.Validator.class)
public @interface ChronologicalDates {

    String message() default "A trip cannot end before it starts.";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    class Validator implements ConstraintValidator<ChronologicalDates, HasDateRange> {

        @Override
        public boolean isValid(HasDateRange request, ConstraintValidatorContext context) {
            if (request == null || request.startDate() == null || request.endDate() == null) {
                return true;
            }
            return !request.startDate().isAfter(request.endDate());
        }
    }
}
