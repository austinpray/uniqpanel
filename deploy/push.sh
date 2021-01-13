#!/bin/sh

set -e

BASEDIR=$(dirname "$0")
UNIQP_CONTAINER_BASE="us.gcr.io/kizuna-188702/github.com/austinpray/uniqpanel"
UNIQP_CONTAINER_TAG="$(git branch --show-current)-$(git rev-parse HEAD)"
UNIQP_APP_CONTAINER_NAME="$UNIQP_CONTAINER_BASE/app:$UNIQP_CONTAINER_TAG"
UNIQP_NGINX_CONTAINER_NAME="$UNIQP_CONTAINER_BASE/nginx:$UNIQP_CONTAINER_TAG"
export UNIQP_APP_CONTAINER_NAME
export UNIQP_NGINX_CONTAINER_NAME
echo "BUILDING $UNIQP_APP_CONTAINER_NAME and $UNIQP_NGINX_CONTAINER_NAME"
docker-compose build

cd "$BASEDIR"
docker push "$UNIQP_APP_CONTAINER_NAME"
docker push "$UNIQP_NGINX_CONTAINER_NAME"

kustomize edit set image "$(docker inspect --format='{{index .RepoDigests 0}}' $UNIQP_APP_CONTAINER_NAME)"
kustomize edit set image "$(docker inspect --format='{{index .RepoDigests 0}}' $UNIQP_NGINX_CONTAINER_NAME)"

