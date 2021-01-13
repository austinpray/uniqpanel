FROM nginx:1.19.6

RUN rm /etc/nginx/conf.d/default.conf

COPY ./templates /etc/nginx/templates

COPY ./.static-cache /app/.static-cache
