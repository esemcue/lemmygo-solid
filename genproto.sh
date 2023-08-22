rm -rf ./proto/*
cd /run/media/likwidsage/Projects/programming/Go/lemmy-go/lemmy-go-auth/proto/
protoc users.proto --js_out=import_style=es6:/run/media/likwidsage/Projects/programming/Go/lemmy-go/lemmy-go-solid/src/proto --grpc-web_out=import_style=commonjs,mode=grpcweb:/run/media/likwidsage/Projects/programming/Go/lemmy-go/lemmy-go-solid/src/proto
