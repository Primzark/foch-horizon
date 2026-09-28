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

interface LegacyPlaceReview {
  author_name?: string;
  author_url?: string;
  profile_photo_url?: string;
  rating?: number;
  text?: string;
  time?: number;
  relative_time_description?: string;
}

interface LegacyPlaceDetailsResponse {
  result?: {
    name?: string;
    rating?: number;
    user_ratings_total?: number;
    reviews?: LegacyPlaceReview[];
  };
  status?: string;
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

async function fetchLegacyReviews(apiKey: string, placeId: string): Promise<LegacyPlaceDetailsResponse["result"] | null> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "name,rating,user_ratings_total,reviews");
  url.searchParams.set("language", "fr");
  url.searchParams.set("reviews_sort", "most_relevant");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url);
  if (!response.ok) return null;

  const payload = (await response.json()) as LegacyPlaceDetailsResponse;
  return payload.status === "OK" ? payload.result ?? null : null;
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

    // The legacy details endpoint supplies review text for this listing. Query it
    // first so a normal page load requires only one billable Place Details call.
    const legacyDetails = await fetchLegacyReviews(apiKey, placeId).catch(() => null);
    const legacyReviews = (legacyDetails?.reviews ?? []).map((review, index) => ({
      id: `google-legacy-${review.time ?? index}-${index}`,
      authorName: review.author_name ?? "Client Google",
      authorUrl: review.author_url,
      authorPhotoUrl: review.profile_photo_url,
      rating: review.rating ?? 0,
      text: (review.text ?? "").trim(),
      publishTime: review.time ? new Date(review.time * 1000).toISOString() : undefined,
      relativePublishTimeDescription: review.relative_time_description,
    })).filter((review) => review.text.length > 0);

    if (legacyReviews.length > 0) {
      return jsonResponse({
        source: "google_places",
        live: true,
        placeName: legacyDetails?.name ?? defaultQuery,
        rating: legacyDetails?.rating ?? 0,
        userRatingCount: legacyDetails?.user_ratings_total ?? legacyReviews.length,
        reviews: legacyReviews,
        fetchedAt: new Date().toISOString(),
      });
    }

    const details = await fetchPlaceDetails(apiKey, placeId);
    const reviews = (details.reviews ?? []).map((review, index) => ({
      id: review.name ?? `google-${index}`,
      authorName: review.authorAttribution?.displayName ?? "Client Google",
      authorUrl: review.authorAttribution?.uri,
      authorPhotoUrl: review.authorAttribution?.photoUri,
      rating: review.rating ?? 0,
      text: (review.text?.text ?? review.originalText?.text ?? "").trim(),
      publishTime: review.publishTime,
      relativePublishTimeDescription: review.relativePublishTimeDescription,
    })).filter((review) => review.text.length > 0);

    return jsonResponse({
      source: "google_places",
      live: true,
      placeName: details.displayName?.text ?? legacyDetails?.name ?? defaultQuery,
      rating: details.rating ?? legacyDetails?.rating ?? 0,
      userRatingCount: details.userRatingCount ?? legacyDetails?.user_ratings_total ?? reviews.length,
      reviews,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
