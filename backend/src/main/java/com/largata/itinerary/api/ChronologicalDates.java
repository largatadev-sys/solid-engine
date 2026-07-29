package com.largata.itinerary.api;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;


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
