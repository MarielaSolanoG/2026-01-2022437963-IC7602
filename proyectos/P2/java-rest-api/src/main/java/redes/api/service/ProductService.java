package redes.api.service;

import org.springframework.stereotype.Service;
import redes.api.dto.ProductRequest;
import redes.api.model.Product;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class ProductService {

    private final ConcurrentHashMap<Long, Product> products = new ConcurrentHashMap<>();
    private final AtomicLong idGenerator = new AtomicLong(1);

    public ProductService() {
        create(new ProductRequest(
                "Router",
                "Router de prueba para el proyecto de redes",
                35000,
                10
        ));

        create(new ProductRequest(
                "Switch",
                "Switch de prueba para validar respuestas JSON",
                28000,
                6
        ));

        create(new ProductRequest(
                "Access Point",
                "Dispositivo inalámbrico usado como dato de ejemplo",
                42000,
                4
        ));
    }

    public List<Product> findAll() {
        List<Product> productList = new ArrayList<>(products.values());
        productList.sort(Comparator.comparing(Product::getId));
        return productList;
    }

    public Optional<Product> findById(Long id) {
        return Optional.ofNullable(products.get(id));
    }

    public Product create(ProductRequest request) {
        Long id = idGenerator.getAndIncrement();

        Product product = new Product(
                id,
                request.getName(),
                request.getDescription(),
                request.getPrice(),
                request.getStock()
        );

        products.put(id, product);
        return product;
    }

    public Optional<Product> update(Long id, ProductRequest request) {
        Product existingProduct = products.get(id);

        if (existingProduct == null) {
            return Optional.empty();
        }

        existingProduct.setName(request.getName());
        existingProduct.setDescription(request.getDescription());
        existingProduct.setPrice(request.getPrice());
        existingProduct.setStock(request.getStock());

        products.put(id, existingProduct);

        return Optional.of(existingProduct);
    }

    public boolean delete(Long id) {
        return products.remove(id) != null;
    }
}