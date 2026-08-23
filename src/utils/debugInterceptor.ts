import {
  RpcInterceptor,
  UnaryCall,
  MethodInfo,
  RpcOptions,
} from "@protobuf-ts/runtime-rpc";

import { getToken, isValid } from "../services/auth";

// Methods that are publicly accessible (no auth required)
// protobuf-ts returns method names in camelCase, so match both cases for safety
const PUBLIC_METHODS = new Set([
  "login",
  "Login",
  "register",
  "Register",
]);

export const debugInterceptor: RpcInterceptor = {
  interceptUnary(
    next,
    method: MethodInfo,
    input: object,
    options: RpcOptions
  ): UnaryCall {
    const fullName = `${method.service.typeName}/${method.name}`;
    console.log(`🚀 gRPC Call: ${fullName}`);
    console.log("📤 Request:", input);

    // Check if this method requires authentication
    const isPublicMethod = PUBLIC_METHODS.has(method.name);

    // Inject JWT Bearer token into metadata if available
    const storedToken = getToken();
    const hasValidToken = storedToken && isValid();
    console.log(`🔍 Interceptor checking cookies for "${fullName}":`, {
      methodType: isPublicMethod ? "public" : "protected",
      tokenFound: !!storedToken,
      tokenValid: hasValidToken,
      tokenLength: storedToken ? storedToken.length : 0,
    });

    // Abort early if a protected method is called without a valid token
    if (!isPublicMethod && !hasValidToken) {
      const reason = storedToken
        ? "⚠️  Token has expired — please log in again"
        : "⚠️  No token found in cookies for authenticated call";
      console.warn(reason);

      // Create a failed call that resolves immediately with an error
      const makeError = (): Error => {
        const err = new Error(
          storedToken ? "Auth token expired" : "missing authorization header"
        );
        (err as Error & { code?: number; details?: string }).code = 16; // codes.UNAUTHENTICATED
        (err as Error & { code?: number; details?: string }).details = reason;
        return err;
      };

      const errorCall: UnaryCall = {
        then: (_onSuccess, onError) => {
          onError?.(makeError());
          return errorCall;
        },
        catch: (onError) => {
          onError?.(makeError());
          return errorCall;
        },
      };
      return errorCall;
    }

    if (storedToken) {
      // IMPORTANT: protobuf-ts uses 'meta' (not 'metadata') for RpcOptions!
      options.meta = {
        ...options.meta,
        authorization: `Bearer ${storedToken}`,
      };
      console.log("🔑 Authorization metadata injected");
    } else if (isPublicMethod) {
      console.log(`ℹ️  Public method "${method.name}" — no auth needed`);
    }

    const call = next(method, input, options);

    call.then(
      (response) => {
        // Dump all response properties for debugging proto deserialization
        const respKeys = Object.keys(response || {});
        console.log("✅ Response keys:", respKeys);
        respKeys.forEach((k) => {
          const v = (response as Record<string, unknown>)[k];
          console.log(`   ${k}:`, typeof v === "string" ? `${v.substring(0, 60)}${v.length > 60 ? "..." : ""}` : v);
        });
      },
      (error) => {
        console.error("❌ Error:", error);
      }
    );

    return call;
  },
};
