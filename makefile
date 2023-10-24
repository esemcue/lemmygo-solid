.DEFAULT_GOAL := deploy

deploy: 
	yarn build
	docker build -t registry.gitlab.com/lemmygo/lemmy-go-solidjs .
	docker push registry.gitlab.com/lemmygo/lemmy-go-solidjs