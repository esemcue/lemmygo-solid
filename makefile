.DEFAULT_GOAL := deploy

deploy: 
	pnpm install --no-frozen-lockfile
	pnpm run build
	docker build -t registry.gitlab.com/lemmygo/lemmygo-solid:latest .
	docker push registry.gitlab.com/lemmygo/lemmygo-solid:latest