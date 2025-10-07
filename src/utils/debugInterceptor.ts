import {
  RpcInterceptor,
  UnaryCall,
  MethodInfo,
  RpcOptions,
} from "@protobuf-ts/runtime-rpc";

export const debugInterceptor: RpcInterceptor = {
  interceptUnary(
    next,
    method: MethodInfo,
    input: object,
    options: RpcOptions
  ): UnaryCall {
    console.log(`🚀 gRPC Call: ${method.service.typeName}.${method.name}`);
    console.log("📤 Request:", input);

    const call = next(method, input, options);

    call.then(
      (response) => {
        console.log("✅ Response:", response);
      },
      (error) => {
        console.error("❌ Error:", error);
      }
    );

    return call;
  },
};
