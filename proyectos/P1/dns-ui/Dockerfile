# Etapa 1: build 
# Usamos Node 20 para compilar el proyecto React con Vite
FROM node:20-alpine AS build

WORKDIR /app

# Copiamos package.json primero para aprovechar el cache de Docker
COPY package*.json ./
RUN npm install

# Copiamos el resto del código y compilamos
COPY . .
RUN npm run build
# El resultado queda en /app/dist

# Etapa 2: servidor 
# Usamos nginx para servir los archivos estáticos compilados
FROM nginx:alpine

# Copiamos los archivos compilados al directorio de nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copiamos la configuración de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]