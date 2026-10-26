# Builds and runs the SILVORA API. Hosts such as Render build this from the backend/ folder.
# Configuration comes only from the host's environment variables; no secret is baked into the image.

# Build stage: compile and test with the project's Maven Wrapper.
FROM eclipse-temurin:21-jdk-noble AS build
WORKDIR /app
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN ./mvnw -B -q dependency:go-offline
COPY src/ src/
RUN ./mvnw -B -q package && cp target/*.jar app.jar

# Run stage: only the Java runtime and the packaged API, running as an unprivileged user.
FROM eclipse-temurin:21-jre-noble
WORKDIR /app
RUN useradd --system --uid 10001 silvora
COPY --from=build /app/app.jar app.jar
USER silvora
# Keeps the JVM inside small (512 MB) hosting plans and restarts cleanly if memory runs out.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
