FROM eclipse-temurin:21-jdk-alpine as builder
WORKDIR /app
COPY . .
RUN chmod +x mvnw && ./mvnw clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080

ENTRYPOINT ["java", \
    "-Xmx512m", \
    "-Xms256m", \
    "-Dspring.liquibase.enabled=false", \
    "-Dspring.profiles.active=docker", \
    "-jar", "app.jar"]
