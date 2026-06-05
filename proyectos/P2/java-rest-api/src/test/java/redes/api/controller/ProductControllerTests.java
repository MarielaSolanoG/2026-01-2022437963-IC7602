package redes.api.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import redes.api.dto.ProductRequest;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class ProductControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void shouldReturnHealthStatus() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.service").value("java-rest-api"));
    }

    @Test
    void shouldReturnAllProducts() throws Exception {
        mockMvc.perform(get("/api/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Router"))
                .andExpect(jsonPath("$[1].name").value("Switch"))
                .andExpect(jsonPath("$[2].name").value("Access Point"));
    }

    @Test
    void shouldReturnProductById() throws Exception {
        mockMvc.perform(get("/api/products/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Router"));
    }

    @Test
    void shouldReturnNotFoundWhenProductDoesNotExist() throws Exception {
        mockMvc.perform(get("/api/products/999"))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldCreateProduct() throws Exception {
        ProductRequest request = new ProductRequest(
                "Firewall",
                "Firewall creado desde prueba de controlador",
                55000,
                3
        );

        mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Firewall"))
                .andExpect(jsonPath("$.description").value("Firewall creado desde prueba de controlador"))
                .andExpect(jsonPath("$.price").value(55000))
                .andExpect(jsonPath("$.stock").value(3));
    }

    @Test
    void shouldUpdateProduct() throws Exception {
        ProductRequest createRequest = new ProductRequest(
                "Producto temporal",
                "Producto creado para probar PUT",
                1000,
                1
        );

        String createResponse = mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode createdProduct = objectMapper.readTree(createResponse);
        long createdId = createdProduct.get("id").asLong();

        ProductRequest updateRequest = new ProductRequest(
                "Producto actualizado",
                "Producto modificado desde PUT",
                2000,
                5
        );

        mockMvc.perform(put("/api/products/" + createdId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Producto actualizado"))
                .andExpect(jsonPath("$.description").value("Producto modificado desde PUT"))
                .andExpect(jsonPath("$.price").value(2000))
                .andExpect(jsonPath("$.stock").value(5));
    }

    @Test
    void shouldDeleteProduct() throws Exception {
        ProductRequest createRequest = new ProductRequest(
                "Producto para eliminar",
                "Producto creado para probar DELETE",
                1500,
                2
        );

        String createResponse = mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode createdProduct = objectMapper.readTree(createResponse);
        long createdId = createdProduct.get("id").asLong();

        mockMvc.perform(delete("/api/products/" + createdId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Producto eliminado correctamente"))
                .andExpect(jsonPath("$.id").value(createdId));
    }

    @Test
    void shouldReturnBadRequestWhenCreatingInvalidProduct() throws Exception {
        ProductRequest request = new ProductRequest(
                "",
                "",
                -100,
                -5
        );

        mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}