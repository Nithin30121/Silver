package com.silvestoluxe.api.notification;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Properties;

import jakarta.mail.Message;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;

class OrderEmailServiceTest {
    private final OrderEmail shipped = new OrderEmail(OrderEmail.Kind.SHIPPED, "asha@example.com", "Asha <b>Rao</b>",
            "SL-20261027-0003", new BigDecimal("3888.00"),
            List.of(new OrderEmail.Line("Moon Ring", 2, new BigDecimal("1998.00")), new OrderEmail.Line("Pendant", 1, new BigDecimal("1890.50"))),
            "12 Sample Street, Hyderabad, Telangana 500001",
            new OrderEmail.Tracking("Delhivery", "DL<123>", "https://track.example.com/DL123"));

    @Test
    void staysOffWithoutAnSmtpHostOrFromAddress() {
        assertFalse(new OrderEmailService("", 587, "", "", "orders@example.com", "SILVORA", "", "").isEnabled());
        assertFalse(new OrderEmailService("smtp.example.com", 587, "", "", "", "SILVORA", "", "").isEnabled());
        assertTrue(new OrderEmailService("smtp.example.com", 587, "", "", "orders@example.com", "SILVORA", "", "").isEnabled());
        assertDoesNotThrow(() -> new OrderEmailService("", 587, "", "", "", "SILVORA", "", "").send(shipped));
    }

    @Test
    void sendsTheEmailToTheCustomer() throws Exception {
        JavaMailSender sender = mock(JavaMailSender.class);
        when(sender.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));

        new OrderEmailService(sender, "SILVORA <orders@example.com>", "SILVORA", "https://shop.example.com").send(shipped);

        ArgumentCaptor<MimeMessage> message = ArgumentCaptor.forClass(MimeMessage.class);
        verify(sender).send(message.capture());
        assertEquals("asha@example.com", message.getValue().getRecipients(Message.RecipientType.TO)[0].toString());
        assertEquals("SILVORA: Your order SL-20261027-0003 is on its way", message.getValue().getSubject());
    }

    @Test
    void aMailServerFailureDoesNotEscape() {
        JavaMailSender sender = mock(JavaMailSender.class);
        when(sender.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));
        doThrow(new MailSendException("connection refused")).when(sender).send(any(MimeMessage.class));

        assertDoesNotThrow(() -> new OrderEmailService(sender, "orders@example.com", "SILVORA", "").send(shipped));
    }

    @Test
    void escapesCustomerTextInTheHtmlBody() {
        String html = OrderEmailContent.html(shipped, "SILVORA", "javascript:alert(1)");

        assertTrue(html.contains("Hi Asha &lt;b&gt;Rao&lt;/b&gt;,"));
        assertFalse(html.contains("<b>Rao</b>"));
        // Only web links are added, so a crafted shop URL cannot become a script link.
        assertFalse(html.contains("javascript:"));
        assertTrue(html.contains("Moon Ring &times; 2"));
    }

    @Test
    void addsCourierTrackingToTheShippedEmail() {
        String text = OrderEmailContent.text(shipped, "SILVORA", "");
        String html = OrderEmailContent.html(shipped, "SILVORA", "");

        assertTrue(text.contains("Courier: Delhivery · Tracking number: DL<123>\nTrack your parcel: https://track.example.com/DL123\n"));
        assertTrue(html.contains("Tracking number: DL&lt;123&gt;"));
        assertTrue(html.contains("<a href=\"https://track.example.com/DL123\""));
    }

    @Test
    void neverLinksAnInsecureTrackingAddressOrMentionsTrackingInOtherEmails() {
        OrderEmail insecure = new OrderEmail(OrderEmail.Kind.SHIPPED, "asha@example.com", "Asha", "SL-1", BigDecimal.ONE,
                List.of(), "", new OrderEmail.Tracking(null, "123", "javascript:alert(1)"));
        OrderEmail delivered = new OrderEmail(OrderEmail.Kind.DELIVERED, "asha@example.com", "Asha", "SL-1", BigDecimal.ONE,
                List.of(), "", new OrderEmail.Tracking("Delhivery", "123", "https://track.example.com/123"));

        assertFalse(OrderEmailContent.html(insecure, "SILVORA", "").contains("javascript:"));
        assertTrue(OrderEmailContent.text(insecure, "SILVORA", "").contains("Tracking number: 123\n"));
        assertFalse(OrderEmailContent.text(delivered, "SILVORA", "").contains("Tracking number"));
    }

    @Test
    void linksToTheOrderPageWhenTheShopHasAnAddress() {
        assertTrue(OrderEmailContent.text(shipped, "SILVORA", "https://shop.example.com/")
                .contains("View your order: https://shop.example.com/account/orders/SL-20261027-0003\n"));
        assertTrue(OrderEmailContent.html(shipped, "SILVORA", "https://shop.example.com")
                .contains("href=\"https://shop.example.com/account/orders/SL-20261027-0003\""));
        assertFalse(OrderEmailContent.text(shipped, "SILVORA", "").contains("View your order"));
    }

    @Test
    void forwardsContactMessagesToTheShopWithReplyToTheSender() throws Exception {
        JavaMailSender sender = mock(JavaMailSender.class);
        when(sender.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));
        ShopMessage contact = new ShopMessage("Asha <b>Rao</b>", "asha@example.com", "+91 90000 00001", "Ring size", "SL-1", "Which <i>size</i>?");

        new OrderEmailService(sender, "SILVORA <orders@example.com>", "SILVORA", "", "owner@example.com").notifyShop(contact);

        ArgumentCaptor<MimeMessage> message = ArgumentCaptor.forClass(MimeMessage.class);
        verify(sender).send(message.capture());
        assertEquals("owner@example.com", message.getValue().getRecipients(Message.RecipientType.TO)[0].toString());
        assertEquals("asha@example.com", message.getValue().getReplyTo()[0].toString());
        assertEquals("SILVORA message from Asha <b>Rao</b>: Ring size", message.getValue().getSubject());
        String html = ShopMessageContent.html(contact);
        assertTrue(html.contains("Which &lt;i&gt;size&lt;/i&gt;?"));
        assertFalse(html.contains("<b>Rao</b>"));
    }

    @Test
    void sendsContactMessagesToTheFromAddressWithoutAnInbox() throws Exception {
        JavaMailSender sender = mock(JavaMailSender.class);
        when(sender.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));

        new OrderEmailService(sender, "orders@example.com", "SILVORA", "").notifyShop(
                new ShopMessage("Asha", "asha@example.com", null, "", null, "Hello"));

        ArgumentCaptor<MimeMessage> message = ArgumentCaptor.forClass(MimeMessage.class);
        verify(sender).send(message.capture());
        assertEquals("orders@example.com", message.getValue().getRecipients(Message.RecipientType.TO)[0].toString());
    }

    @Test
    void writesAPlainTextVersionWithRupeeAmounts() {
        String text = OrderEmailContent.text(shipped, "SILVORA", "https://shop.example.com");

        assertTrue(text.contains("- Moon Ring x 2: ₹1,998\n"));
        assertTrue(text.contains("- Pendant x 1: ₹1,890.50\n"));
        assertTrue(text.contains("Total: ₹3,888\n"));
        assertTrue(text.endsWith("SILVORA\nhttps://shop.example.com\n"));
    }
}
