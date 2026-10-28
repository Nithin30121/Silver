package com.silvestoluxe.api.config;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import com.silvestoluxe.api.contact.ContactController;
import com.silvestoluxe.api.contact.ContactService;
import com.silvestoluxe.api.security.CatalogAuthorization;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** Anyone may send a message; only an admin may read them. */
@WebMvcTest(ContactController.class)
@Import(SecurityConfig.class)
class ContactAccessTest {

    @DynamicPropertySource
    static void supabaseJwks(DynamicPropertyRegistry registry) {
        registry.add("SUPABASE_JWKS_URL", TestJwks::jwksUrl);
    }

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private ContactService contact;

    @MockitoBean(name = "catalogAuthorization")
    private CatalogAuthorization authorization;

    private static final String MESSAGE = """
            {"name":"Asha","email":"asha@example.com","phone":"","subject":"Sizing","orderNumber":"","message":"Which size fits?","website":""}
            """;

    @Test
    void aVisitorCanSendAMessage() throws Exception {
        mvc.perform(post("/api/contact").contentType(MediaType.APPLICATION_JSON).content(MESSAGE).header("X-Forwarded-For", "203.0.113.7, 10.0.0.1"))
                .andExpect(status().isNoContent());
        verify(contact).submit(any(), isNull(), eq("203.0.113.7"));
    }

    @Test
    void aSignedInCustomersMessageCarriesTheirAccount() throws Exception {
        String subject = UUID.randomUUID().toString();
        mvc.perform(post("/api/contact").contentType(MediaType.APPLICATION_JSON).content(MESSAGE)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + TestJwks.accessToken(TestJwks.SUPABASE_KEY, subject)))
                .andExpect(status().isNoContent());
        verify(contact).submit(any(), eq(subject), any());
    }

    @Test
    void explainsAnInvalidEmail() throws Exception {
        mvc.perform(post("/api/contact").contentType(MediaType.APPLICATION_JSON).content(MESSAGE.replace("asha@example.com", "not-an-email")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.email").value("Please enter a valid email address."));
        verify(contact, never()).submit(any(), any(), any());
    }

    @Test
    void keepsMessagesFromEveryoneButAdmins() throws Exception {
        mvc.perform(get("/api/admin/messages")).andExpect(status().isUnauthorized());
        when(authorization.isAdmin(any())).thenReturn(false);
        String customer = "Bearer " + TestJwks.accessToken(TestJwks.SUPABASE_KEY, UUID.randomUUID().toString());
        mvc.perform(get("/api/admin/messages").header(HttpHeaders.AUTHORIZATION, customer)).andExpect(status().isForbidden());
        mvc.perform(patch("/api/admin/messages/" + UUID.randomUUID() + "/status").header(HttpHeaders.AUTHORIZATION, customer)
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"DONE\"}")).andExpect(status().isForbidden());
        verify(contact, never()).list(any(), anyInt(), anyInt());
        verify(contact, never()).updateStatus(any(), any());
    }

    @Test
    void listsMessagesForAnAdmin() throws Exception {
        when(authorization.isAdmin(any())).thenReturn(true);
        when(contact.list(isNull(), eq(0), eq(25))).thenReturn(Page.empty());

        mvc.perform(get("/api/admin/messages").header(HttpHeaders.AUTHORIZATION,
                        "Bearer " + TestJwks.accessToken(TestJwks.SUPABASE_KEY, UUID.randomUUID().toString())))
                .andExpect(status().isOk());
    }
}
