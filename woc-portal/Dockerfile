FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

#EXPOSE 3000
#CMD ["npm", "start"]


# Build the React app
RUN npm run build

FROM nginx:latest

# Remove default Nginx website configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration
# (This step is optional if you have a custom nginx.conf)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output from the build stage to Nginx www directory
COPY --from=build /app/build /usr/share/nginx/html

# Expose the port the frontend app runs on
EXPOSE 3000

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]