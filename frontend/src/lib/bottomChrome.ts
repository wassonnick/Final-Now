import { useEffect } from "react";

/**
 * Tell anything pinned to the bottom of the screen how much room this page is using.
 *
 * The consent banner, and anything else that floats above the tab bar, has no way to know
 * that a page has added its own sticky CTA — so it sat on top of the brief builder's
 * Continue button and ate the tap. A page that pins something declares its height here,
 * and the floating chrome moves up by exactly that much.
 *
 * Only applied below the large breakpoint, since sticky mobile CTAs do not exist above it.
 */
export function useBottomChrome(heightRem: number): void {
  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px)");

    const apply = () => {
      if (query.matches) {
        document.documentElement.style.setProperty("--sf-bottom-chrome", `${heightRem}rem`);
      } else {
        document.documentElement.style.removeProperty("--sf-bottom-chrome");
      }
    };

    apply();
    query.addEventListener("change", apply);

    return () => {
      query.removeEventListener("change", apply);
      document.documentElement.style.removeProperty("--sf-bottom-chrome");
    };
  }, [heightRem]);
}
