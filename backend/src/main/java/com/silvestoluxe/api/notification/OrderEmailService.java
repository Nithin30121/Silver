package com.silvestoluxe.api.notification;

import java.nio.charset.StandardCharsets;
import java.util.Properties;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Sends order emails over SMTP, so any email provider works. Email stays off until the server has an
 * SMTP host and a from address; the SMTP password is a server-only secret like the database password.
 */
@Service
public class OrderEmailService {
    private static final Logger log = LoggerFactory.getLogger(OrderEmailService.class);

    private final JavaMailSender sender;
    private final String from;
    private final String shopName;
    private final String shopUrl;

    @Autowired
    public OrderEmailService(@Value("${app.mail.host:}") String host,
                             @Value("${app.mail.port:587}") int port,
                             @Value("${app.mail.username:}") String username,
                             @Value("${app.mail.password:}") String password,
                             @Value("${app.mail.from:}") String from,
                             @Value("${app.mail.shop-name:SILVORA}") String shopName,
                             @Value("${app.mail.shop-url:}") String shopUrl) {
        this(host.isBlank() || from.isBlank() ? null : smtp(host.trim(), port, username.trim(), password),
                from.trim(), shopName.trim(), shopUrl.trim());
    }

    OrderEmailService(JavaMailSender sender, String from, String shopName, String shopUrl) {
        this.sender = sender;
        this.from = from;
        this.shopName = shopName;
        this.shopUrl = shopUrl;
    }

    public boolean isEnabled() { return sender != null; }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void send(OrderEmail email) {
        if (sender == null || email.to() == null || email.to().isBlank()) return;
        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(from);
            helper.setTo(email.to().trim());
            helper.setSubject(OrderEmailContent.subject(email, shopName));
            helper.setText(OrderEmailContent.text(email, shopName, shopUrl), OrderEmailContent.html(email, shopName, shopUrl));
            sender.send(message);
            log.info("Sent the {} email for order {}.", email.kind(), email.orderNumber());
        } catch (MessagingException | MailException exception) {
            // The order change is already saved, so a failed email must not undo it. Addresses stay out of the logs.
            log.warn("Could not send the {} email for order {} ({}).", email.kind(), email.orderNumber(),
                    exception.getClass().getSimpleName());
        }
    }

    private static JavaMailSender smtp(String host, int port, String username, String password) {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(host);
        sender.setPort(port);
        sender.setDefaultEncoding(StandardCharsets.UTF_8.name());
        Properties properties = sender.getJavaMailProperties();
        if (!username.isBlank()) {
            sender.setUsername(username);
            sender.setPassword(password);
            properties.put("mail.smtp.auth", "true");
        }
        // Port 465 is encrypted from the first byte; the other submission ports upgrade with STARTTLS.
        if (port == 465) properties.put("mail.smtp.ssl.enable", "true");
        else properties.put("mail.smtp.starttls.enable", "true");
        properties.put("mail.smtp.connectiontimeout", "10000");
        properties.put("mail.smtp.timeout", "10000");
        properties.put("mail.smtp.writetimeout", "10000");
        return sender;
    }
}
