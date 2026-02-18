import { apiJson, isEdgeApiEnabled } from "@/lib/api/client";

const directApiKey =
  (import.meta.env.VITE_GOOGLE_PLACES_API_KEY as string | undefined) ??
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined);
const directPlaceId = import.meta.env.VITE_GOOGLE_PLACE_ID as string | undefined;

export interface AgencyReview {
  id: string;
  authorName: string;
  authorUrl?: string;
  authorPhotoUrl?: string;
  rating: number;
  text: string;
  publishTime?: string;
  relativePublishTimeDescription?: string;
}

export interface AgencyReviewsResponse {
  source: "google_places" | "edge" | "fallback";
  live: boolean;
  placeName: string;
  rating: number;
  userRatingCount: number;
  reviews: AgencyReview[];
  fetchedAt: string;
}

interface GooglePlaceReview {
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

interface GooglePlaceDetailsResponse {
  displayName?: { text?: string };
  rating?: number;
  userRatingCount?: number;
  reviews?: GooglePlaceReview[];
}

const fallbackPayload: AgencyReviewsResponse = {
  source: "fallback",
  live: false,
  placeName: "Foch Immobilier Le Havre",
  rating: 4.8,
  userRatingCount: 87,
  fetchedAt: new Date().toISOString(),
  reviews: [
    {
      id: "fallback-1",
      authorName: "Client transaction",
      rating: 5,
      text: "Accompagnement tres precis sur notre achat appartement au Havre. Dossier clair du compromis a l'acte.",
      relativePublishTimeDescription: "recent",
    },
    {
      id: "fallback-2",
      authorName: "Proprietaire bailleur",
      rating: 5,
      text: "Bonne gestion locative au Havre, mise en location rapide et suivi rigoureux des candidats.",
      relativePublishTimeDescription: "recent",
    },
    {
      id: "fallback-3",
      authorName: "Vendeur",
      rating: 4,
      text: "Estimation immobiliere Le Havre coherente avec le marche et vente menee dans un delai raisonnable.",
      relativePublishTimeDescription: "recent",
    },
    {
      id: "fallback-4",
      authorName: "Acquereur",
      rating: 5,
      text: "Equipe reactive sur la recherche de maison au Havre, avec un vrai conseil quartier par quartier.",
      relativePublishTimeDescription: "recent",
    },
  ],
};

function normalizeDirectPlaceResponse(payload: GooglePlaceDetailsResponse): AgencyReviewsResponse {
  const reviews = (payload.reviews ?? []).map((review, index) => ({
    id: review.name ?? `google-${index}`,
    authorName: review.authorAttribution?.displayName ?? "Client Google",
    authorUrl: review.authorAttribution?.uri,
    authorPhotoUrl: review.authorAttribution?.photoUri,
    rating: review.rating ?? 0,
    text: review.text?.text ?? review.originalText?.text ?? "",
    publishTime: review.publishTime,
    relativePublishTimeDescription: review.relativePublishTimeDescription,
  }));

  return {
    source: "google_places",
    live: true,
    placeName: payload.displayName?.text ?? "Foch Immobilier Le Havre",
    rating: payload.rating ?? 0,
    userRatingCount: payload.userRatingCount ?? reviews.length,
    reviews,
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchDirectGoogleReviews(apiKey: string, placeId: string): Promise<AgencyReviewsResponse> {
  const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}?languageCode=fr&regionCode=FR`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "displayName,rating,userRatingCount,reviews",
    },
  });

  if (!response.ok) {
    throw new Error(`Google Places request failed (${response.status})`);
  }

  const payload = (await response.json()) as GooglePlaceDetailsResponse;
  return normalizeDirectPlaceResponse(payload);
}

export async function getAgencyReviews(): Promise<AgencyReviewsResponse> {
  if (directApiKey && directPlaceId) {
    try {
      return await fetchDirectGoogleReviews(directApiKey, directPlaceId);
    } catch {
      // Continue to edge and fallback strategies.
    }
  }

  if (isEdgeApiEnabled()) {
    try {
      const payload = await apiJson<AgencyReviewsResponse>("/api/google-reviews");
      return {
        ...payload,
        source: "edge",
        live: true,
      };
    } catch {
      // Fall through to fallback payload.
    }
  }

  return {
    ...fallbackPayload,
    fetchedAt: new Date().toISOString(),
  };
}
