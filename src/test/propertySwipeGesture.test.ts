import {
  beginPropertySwipe,
  resolvePropertySwipeDirection,
  shouldSuppressPostSwipeClick,
  trackPropertySwipeMove,
} from "@/features/listings/navigation/propertySwipeGesture";

describe("property swipe gestures", () => {
  it("does not treat a tap or small horizontal drift as a property change", () => {
    const gesture = beginPropertySwipe(document.createElement("div"), { x: 120, y: 240 });
    const tracked = trackPropertySwipeMove(gesture, { x: 178, y: 246 });

    expect(resolvePropertySwipeDirection(tracked, { x: 178, y: 246 })).toBeNull();
  });

  it("requires horizontal intent and enough travel for a property swipe", () => {
    const gesture = beginPropertySwipe(document.createElement("div"), { x: 240, y: 320 });
    const tracked = trackPropertySwipeMove(gesture, { x: 226, y: 318 });

    expect(resolvePropertySwipeDirection(tracked, { x: 150, y: 322 })).toBe(1);
    expect(resolvePropertySwipeDirection(tracked, { x: 330, y: 322 })).toBe(-1);
  });

  it("does not treat vertical scrolling as a property swipe", () => {
    const gesture = beginPropertySwipe(document.createElement("div"), { x: 120, y: 240 });
    const tracked = trackPropertySwipeMove(gesture, { x: 124, y: 258 });

    expect(resolvePropertySwipeDirection(tracked, { x: 220, y: 260 })).toBeNull();
  });

  it("ignores gestures that start on interactive controls", () => {
    const link = document.createElement("a");
    const label = document.createElement("span");
    link.append(label);

    const gesture = beginPropertySwipe(label, { x: 120, y: 240 });
    const tracked = trackPropertySwipeMove(gesture, { x: 220, y: 242 });

    expect(resolvePropertySwipeDirection(tracked, { x: 220, y: 242 })).toBeNull();
  });

  it("suppresses the synthetic click after a property swipe but preserves keyboard clicks", () => {
    expect(shouldSuppressPostSwipeClick(500, 420, 1)).toBe(true);
    expect(shouldSuppressPostSwipeClick(500, 501, 1)).toBe(false);
    expect(shouldSuppressPostSwipeClick(500, 420, 0)).toBe(false);
  });
});
