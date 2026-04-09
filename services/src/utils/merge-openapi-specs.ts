/**
 * Utility to merge OpenAPI specs at runtime.
 * Combines tsoa-generated spec with manual SSE endpoint definitions.
 */

type OpenApiSpec = {
  paths?: Record<string, unknown>;
  components?: {
    schemas?: Record<string, unknown>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

/**
 * Deep merge two objects recursively
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: T): T {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = result[key];

    if (
      sourceVal &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      (result as Record<string, unknown>)[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>
      );
    } else {
      (result as Record<string, unknown>)[key] = sourceVal;
    }
  }

  return result;
}

/**
 * Merge tsoa-generated OpenAPI spec with manual route definitions
 */
export function mergeOpenApiSpecs(
  baseSpec: OpenApiSpec,
  manualSpec: OpenApiSpec
): OpenApiSpec {
  return deepMerge(baseSpec, manualSpec);
}
