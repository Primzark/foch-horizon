import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

interface GoogleReview {
  name?: string;
  rating?: number;
  relativePublishTimeDescription?: string;
  publishTime?: string;
  text?: { text?: string };
  originalText?: { text?: string };
  authorAttribution?: {
    displayName?: string;
    uri?: string;
    photoUri?: string;
  };
}

interface PlaceDetailsResponse {
  displayName?: { text?: string };
  rating?: number;
  userRatingCount?: number;
  reviews?: GoogleReview[];
}

async function resolvePlaceId(apiKey: string, textQuery: string): Promise<string | null> {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id",
    },
    body: JSON.stringify({
      textQuery,
      languageCode: "fr",
      maxResultCount: 1,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { places?: Array<{ id?: string }> };
  return payload.places?.[0]?.id ?? null;
}

async function fetchPlaceDetails(apiKey: string, placeId: string): Promise<PlaceDetailsResponse> {
  const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}?languageCode=fr&regionCode=FR`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "displayName,rating,userRatingCount,reviews",
    },
  });

  if (!response.ok) {
    throw new Error(`Places details request failed (${response.status})`);
  }

  return (await response.json()) as PlaceDetailsResponse;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "GET") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY") ?? "";
  const configuredPlaceId = Deno.env.get("GOOGLE_PLACE_ID") ?? "";
  const defaultQuery = Deno.env.get("GOOGLE_PLACE_QUERY") ?? "Foch Immobilier Le Havre";

  if (!apiKey) {
    return jsonResponse({ ok: false, error: "GOOGLE_PLACES_API_KEY is missing" }, 503);
  }

  try {
    let placeId = configuredPlaceId;

    if (!placeId) {
      placeId = await resolvePlaceId(apiKey, defaultQuery) ?? "";
    }

    if (!placeId) {
      return jsonResponse({ ok: false, error: "Unable to resolve Google place id" }, 404);
    }

    const details = await fetchPlaceDetails(apiKey, placeId);
    const reviews = (details.reviews ?? []).map((review, index) => ({
      id: review.name ?? `google-${index}`,
      authorName: review.authorAttribution?.displayName ?? "Client Google",
      authorUrl: review.authorAttribution?.uri,
      authorPhotoUrl: review.authorAttribution?.photoUri,
      rating: review.rating ?? 0,
      text: review.text?.text ?? review.originalText?.text ?? "",
      publishTime: review.publishTime,
      relativePublishTimeDescription: review.relativePublishTimeDescription,
    }));

    return jsonResponse({
      source: "google_places",
      live: true,
      placeName: details.displayName?.text ?? defaultQuery,
      rating: details.rating ?? 0,
      userRatingCount: details.userRatingCount ?? reviews.length,
      reviews,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
