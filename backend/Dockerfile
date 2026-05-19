FROM node:22-alpine

WORKDIR /src

COPY package*.json ./

RUN npm install

COPY . ./

EXPOSE 8080

CMD [ "node", "./server.js" ]


