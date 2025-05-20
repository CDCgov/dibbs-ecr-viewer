import React from "react";

/**
 *
 * @param handleEsc
 */
function useEscapeKey(handleEsc) {
  React.useEffect(() => {
    function handleKeydown(e) {
      if (e.code === "Escape") {
        handleEsc();
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [handleEsc]);
}

export default useEscapeKey;
