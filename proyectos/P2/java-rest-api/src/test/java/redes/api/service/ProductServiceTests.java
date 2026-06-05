package redes.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import redes.api.dto.ProductRequest;
import redes.api.model.Product;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class ProductServiceTests {

    private ProductService productService;

    @BeforeEach
    void setUp() {
        productService = new ProductService();
    }

    @Test
    void shouldReturnInitialProducts() {
        List<Product> products = productService.findAll();

        assertEquals(3, products.size());
        assertEquals("Router", products.get(0).getName());
        assertEquals("Switch", products.get(1).getName());
        assertEquals("Access Point", products.get(2).getName());
    }

    @Test
    void shouldFindProductById() {
        Optional<Product> product = productService.findById(1L);

        assertTrue(product.isPresent());
        assertEquals("Router", product.get().getName());
    }

    @Test
    void shouldReturnEmptyWhenProductDoesNotExist() {
        Optional<Product> product = productService.findById(999L);

        assertTrue(product.isEmpty());
    }

    @Test
    void shouldCreateProduct() {
        ProductRequest request = new ProductRequest(
                "Firewall",
                "Firewall creado desde prueba unitaria",
                55000,
                3
        );

        Product createdProduct = productService.create(request);

        assertNotNull(createdProduct.getId());
        assertEquals("Firewall", createdProduct.getName());
        assertEquals(55000, createdProduct.getPrice());
        assertEquals(3, createdProduct.getStock());

        List<Product> products = productService.findAll();
        assertEquals(4, products.size());
    }

    @Test
    void shouldUpdateProduct() {
        ProductRequest request = new ProductRequest(
                "Router actualizado",
                "Router modificado desde prueba unitaria",
                39000,
                8
        );

        Optional<Product> updatedProduct = productService.update(1L, request);

        assertTrue(updatedProduct.isPresent());
        assertEquals("Router actualizado", updatedProduct.get().getName());
        assertEquals(39000, updatedProduct.get().getPrice());
        assertEquals(8, updatedProduct.get().getStock());
    }

    @Test
    void shouldReturnEmptyWhenUpdatingProductThatDoesNotExist() {
        ProductRequest request = new ProductRequest(
                "Producto inexistente",
                "Este producto no debería actualizarse",
                1000,
                1
        );

        Optional<Product> updatedProduct = productService.update(999L, request);

        assertTrue(updatedProduct.isEmpty());
    }

    @Test
    void shouldDeleteProduct() {
        boolean deleted = productService.delete(2L);

        assertTrue(deleted);
        assertTrue(productService.findById(2L).isEmpty());
    }

    @Test
    void shouldReturnFalseWhenDeletingProductThatDoesNotExist() {
        boolean deleted = productService.delete(999L);

        assertFalse(deleted);
    }
}