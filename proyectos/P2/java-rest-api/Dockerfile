# Etapa 1: compilar la aplicación con Maven y Java 17
FROM maven:3.9.9-eclipse-temurin-17 AS build

WORKDIR /app

COPY pom.xml .
COPY src ./src

RUN mvn clean package -DskipTests

# Etapa 2: ejecutar solo el .jar generado
FROM eclipse-temurin:17-jre

WORKDIR /app

COPY --from=build /app/target/java-rest-api-1.0.0.jar app.jar

ENV SERVER_PORT=8080

EXPOSE 8080

CMD ["java", "-jar", "app.jar"]


# docker build -t java-rest-api:latest .\java-rest-api
# helm upgrade --install java-rest-api .\charts\java-rest-api
# kubectl get pods
# kubectl get svc
# kubectl port-forward svc/java-rest-api-service 8081:8080
# curl http://localhost:8081/api/health
# curl http://localhost:8081/api/products
# http://java-rest-api-service:8080/api/products