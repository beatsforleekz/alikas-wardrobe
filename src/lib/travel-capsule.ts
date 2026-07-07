const TRAVEL_CAPSULE_LINKS_KEY = "alikas-wardrobe:travel-capsule-links";

type TravelCapsuleLinkMap = Record<string, string>;

export function getTravelCapsuleLinks() {
  if (typeof window === "undefined") {
    return {} as TravelCapsuleLinkMap;
  }

  try {
    const raw = window.localStorage.getItem(TRAVEL_CAPSULE_LINKS_KEY);
    if (!raw) {
      return {} as TravelCapsuleLinkMap;
    }

    const parsed = JSON.parse(raw) as TravelCapsuleLinkMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {} as TravelCapsuleLinkMap;
  }
}

export function getTravelCapsuleLink(tripId: string) {
  return getTravelCapsuleLinks()[tripId] ?? "";
}

export function setTravelCapsuleLink(tripId: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }

  const current = getTravelCapsuleLinks();
  const nextValue = value.trim();

  if (nextValue) {
    current[tripId] = nextValue;
  } else {
    delete current[tripId];
  }

  window.localStorage.setItem(TRAVEL_CAPSULE_LINKS_KEY, JSON.stringify(current));
}

export function isLikelyTravelCapsuleUrl(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}
