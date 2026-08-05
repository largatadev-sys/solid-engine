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
@Constraint(validatedBy = PairedMoney.Validator.class)
public @interface PairedMoney {

    String message() default "An amount needs a currency, and a currency needs an amount.";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    class Validator implements ConstraintValidator<PairedMoney, HasPairedMoney> {

        @Override
        public boolean isValid(HasPairedMoney request, ConstraintValidatorContext context) {
            if (request == null) {
                return true;
            }
            return paired(request.costAmount(), request.costCurrency())
                    && paired(request.bookingPriceAmount(), request.bookingPriceCurrency());
        }

        private static boolean paired(String amount, String currency) {
            return isBlank(amount) == isBlank(currency);
        }

        private static boolean isBlank(String value) {
            return value == null || value.isBlank();
        }
    }
}
