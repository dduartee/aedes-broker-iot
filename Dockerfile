# Base image
FROM node:20

# Create app directory
WORKDIR /usr/src/app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install app dependencies
RUN npm install

# Bundle app source
COPY . .
RUN npm run build
# Start the server using the production build
CMD [ "node", "dist/index.js" ]

# Exposing server port
EXPOSE 8443
