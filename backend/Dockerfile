# Multi-stage: the AC is "docker compose up from a clean checkout" — someone with Docker and no
# JDK, no Maven, gets a running stack. So the build happens inside the image, not on the host.

# ---- build stage -------------------------------------------------------------------------
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /build

# Dependencies resolve in their own layer: pom.xml changes rarely, sources change constantly,
# so this layer stays cached across ordinary code edits.
COPY pom.xml .
RUN mvn -B dependency:go-offline

COPY src ./src
# Tests are skipped here on purpose. They need a Docker daemon (Testcontainers), which is not
# available inside a build container. `mvn verify` on the host and the CI backend job own the
# test gate; this stage's job is to produce the jar.
RUN mvn -B clean package -DskipTests

# ---- runtime stage -----------------------------------------------------------------------
FROM eclipse-temurin:25-jre-alpine AS runtime
WORKDIR /app

# Non-root: a container process that never needs to write to its own filesystem shouldn't run
# as root.
RUN addgroup -S largata && adduser -S largata -G largata
USER largata

COPY --from=build /build/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
