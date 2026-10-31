package com.silvestoluxe.api.payment;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Runs only while the server is awake, so on the free plan unpaid orders may wait for the next visit. */
@Component
class PaymentExpirySweep {
    private final PaymentService payments;

    PaymentExpirySweep(PaymentService payments) { this.payments = payments; }

    @Scheduled(fixedDelayString = "${app.razorpay.check-every:PT5M}", initialDelayString = "${app.razorpay.check-every:PT5M}")
    void run() { payments.expireOverdue(); }
}
