import { healthResponseSchema } from '@pokermanic/contracts';

export default defineEventHandler(async (event) => {
  const { apiBaseUrl } = useRuntimeConfig(event);

  try {
    const response = await $fetch<unknown>(`${apiBaseUrl}/api/health`);
    // Never trust an API response merely because both packages use TypeScript.
    return healthResponseSchema.parse(response);
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: 'PokerManic API is unavailable or returned an invalid response',
    });
  }
});
