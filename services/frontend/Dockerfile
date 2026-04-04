<<<<<<< HEAD
# 1. Build stage
FROM node:20-alpine AS builder
=======
FROM node:20-alpine
>>>>>>> cf4160682377f13aa01307c7fc5fd8abd4be69cc

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
<<<<<<< HEAD
RUN npm run build

# 2. Run stage
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app ./

=======

RUN npm run build

>>>>>>> cf4160682377f13aa01307c7fc5fd8abd4be69cc
EXPOSE 3000

CMD ["npm", "start"]