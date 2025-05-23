import { useEffect } from "react";

/**
 * Hook to do something when escape is pressed (typically close something)
 * @param handleEsc handler for when the escape key is pressed
 */
function useEscapeKey(handleEsc: () => void) {
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.code === "Escape") {
        handleEsc();
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [handleEsc]);
}

export default useEscapeKey;
