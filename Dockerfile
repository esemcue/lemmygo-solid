# Stage 1: Build
FROM node:18-alpine AS build
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

ENV CI=true

COPY . .
RUN pnpm install --no-frozen-lockfile

RUN pnpm run build

# Stage 2: Serve with nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
