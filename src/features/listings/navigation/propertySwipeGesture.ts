const PROPERTY_SWIPE_IGNORE_SELECTOR =
  "[data-property-gallery], button, a, input, textarea, select, [contenteditable='true'], [role='button']";

export const PROPERTY_SWIPE_MIN_DISTANCE = 80;
const AXIS_LOCK_DISTANCE = 10;

export interface PropertySwipePoint {
  x: number;
  y: number;
}

export interface PropertySwipeGesture extends PropertySwipePoint {
  axis: "pending" | "horizontal" | "vertical";
}

export function beginPropertySwipe(
  target: EventTarget | null,
  point: PropertySwipePoint,
): PropertySwipeGesture | null {
  if (target instanceof Element && target.closest(PROPERTY_SWIPE_IGNORE_SELECTOR)) return null;
  return { ...point, axis: "pending" };
}

export function trackPropertySwipeMove(
  gesture: PropertySwipeGesture | null,
  point: PropertySwipePoint,
): PropertySwipeGesture | null {
  if (!gesture || gesture.axis !== "pending") return gesture;

  const deltaX = Math.abs(point.x - gesture.x);
  const deltaY = Math.abs(point.y - gesture.y);
  if (Math.max(deltaX, deltaY) < AXIS_LOCK_DISTANCE) return gesture;
  if (deltaX >= deltaY * 1.15) return { ...gesture, axis: "horizontal" };
  if (deltaY >= deltaX * 1.15) return { ...gesture, axis: "vertical" };
  return gesture;
}

export function resolvePropertySwipeDirection(
  gesture: PropertySwipeGesture | null,
  point: PropertySwipePoint,
): -1 | 1 | null {
  if (!gesture || gesture.axis !== "horizontal") return null;

  const deltaX = point.x - gesture.x;
  const deltaY = point.y - gesture.y;
  if (
    Math.abs(deltaX) < PROPERTY_SWIPE_MIN_DISTANCE ||
    Math.abs(deltaX) < Math.abs(deltaY) * 1.25
  ) {
    return null;
  }

  return deltaX < 0 ? 1 : -1;
}

export function shouldSuppressPostSwipeClick(deadline: number, now: number, clickDetail: number): boolean {
  return clickDetail > 0 && now <= deadline;
}
