# Dockerfile
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY target/*.jar app.jar
EXPOSE 8080

# Отключаем Liquibase через системное свойство
ENTRYPOINT ["java", \
    "-Xmx256m", \
    "-Xms128m", \
    "-XX:+UseG1GC", \
    "-XX:MaxGCPauseMillis=100", \
    "-Dspring.liquibase.enabled=false", \
    "-Dspring.profiles.active=docker", \
    "-jar", "app.jar"]