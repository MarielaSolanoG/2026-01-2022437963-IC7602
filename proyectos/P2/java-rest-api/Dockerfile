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