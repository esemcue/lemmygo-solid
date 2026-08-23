# Stage 1: Build
FROM node:18-alpine AS build
WORKDIR /app

ENV CI=true

COPY . .
RUN yarn install --frozen-lockfile

RUN yarn build

# Stage 2: Serve with nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
