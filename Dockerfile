FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM maven:3.9.9-eclipse-temurin-21 AS backend-build
WORKDIR /app
COPY system/pom.xml system/pom.xml
COPY system/src system/src
COPY --from=frontend-build /app/frontend/dist system/src/main/resources/static
RUN mvn -f system/pom.xml -DskipTests package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /opt/app
COPY --from=backend-build /app/system/target/system-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
