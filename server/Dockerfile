FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY server ./server
COPY mobile/src/content/schema.ts ./mobile/src/content/schema.ts
RUN mkdir data && chown node:node data
USER node
EXPOSE 8787
CMD ["npm", "run", "server"]
