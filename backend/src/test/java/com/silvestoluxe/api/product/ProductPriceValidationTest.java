package com.silvestoluxe.api.product;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/** The admin can't save a piece at ₹0 (or less), because checkout would then sell it for free. */
class ProductPriceValidationTest {
    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void startValidator() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void stopValidator() {
        factory.close();
    }

    @Test
    void aPriceOfZeroIsRefusedWithAClearMessage() {
        List<String> problems = priceProblems("0.00");

        assertEquals(List.of("Enter a price above ₹0."), problems);
    }

    @Test
    void aNegativePriceIsRefused() {
        assertEquals(List.of("Enter a price above ₹0."), priceProblems("-5.00"));
    }

    @Test
    void anyPriceAboveZeroIsAccepted() {
        assertTrue(priceProblems("0.01").isEmpty());
        assertTrue(priceProblems("2500.00").isEmpty());
    }

    private static List<String> priceProblems(String price) {
        ProductDtos.Upsert request = new ProductDtos.Upsert("Moon Ring", "moon-ring", null, null, new BigDecimal(price), null, null,
                null, 5, true, Set.of());
        return validator.validate(request).stream()
                .filter(violation -> violation.getPropertyPath().toString().equals("price"))
                .map(ConstraintViolation::getMessage)
                .toList();
    }
}
