# # Stage 1: Build the React app
# FROM node:20-alpine AS build

# # Set working directory
# WORKDIR /app

# # Copy package files and install dependencies
# COPY package*.json ./
# RUN npm install

# # Copy the rest of the project
# COPY . .

# # Build the React app
# RUN npm run build

# # Stage 2: Serve with Nginx
# FROM nginx:alpine

# # Copy build output to Nginx’s html folder
# COPY --from=build /app/dist /usr/share/nginx/html
# # (If you're using create-react-app instead of Vite, replace `/dist` with `/build`)

# # Expose port 80
# EXPOSE 80

# # Start Nginx server
# CMD ["nginx", "-g", "daemon off;"]


# Stage 1: Build the React app
# FROM node:20-alpine AS build

# WORKDIR /app
# COPY package*.json ./
# RUN npm install
# COPY . .
# RUN npm run build

# # Stage 2: Serve with Nginx
# FROM nginx:alpine
# # COPY --from=build /app/dist /usr/share/nginx/html

# COPY --from=build /app/build /usr/share/nginx/html
# # (or /app/build if using create-react-app)
# EXPOSE 80
# CMD ["nginx", "-g", "daemon off;"]


FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 3000
CMD ["npm", "start"]