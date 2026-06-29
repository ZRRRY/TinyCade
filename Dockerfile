# TINYCADE - \u4ee5 node \u8fd0\u884c\u4ee3\u7801\u4e2d\u9644\u5e26\u7684\u9759\u6001\u670d\u52a1\u5668
FROM node:20-alpine

WORKDIR /app
COPY . .

ENV PORT=8088
EXPOSE 8088

# \u68c0\u67e5\u8bed\u6cd5
RUN node --check server.js && node --check app.js && node --check games.js && node --check games-extra.js && node --check sounds.js

USER node
CMD ["node", "server.js", "--port", "8088"]
