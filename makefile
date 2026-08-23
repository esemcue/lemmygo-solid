.DEFAULT_GOAL := deploy

deploy: 
	yarn install --frozen-lockfile
	yarn build
	docker build -t registry.gitlab.com/lemmygo/lemmygo-solid:latest .
	docker push registry.gitlab.com/lemmygo/lemmygo-solid:latest