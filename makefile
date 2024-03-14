.DEFAULT_GOAL := deploy

deploy: 
	yarn 
	yarn build
	docker build -t registry.gitlab.com/lemmygo/lemmy-go-solid .
	docker push registry.gitlab.com/lemmygo/lemmy-go-solid