FROM node:22-alpine AS build
WORKDIR /src
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --base-href=/apps/steganography/

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist/steganography/browser /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
