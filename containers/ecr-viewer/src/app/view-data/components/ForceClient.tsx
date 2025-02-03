"use client";
import React, { ReactNode, useEffect, useState } from "react";

/**
 * Force a component to only render on the client side
 * @param params react params
 * @param params.loading component to show while loading
 * @param params.children component to render client side
 * @returns component
 */
export const ForceClient = ({
  children,
  loading,
}: {
  children: ReactNode;
  loading: ReactNode;
}) => {
  const [render, setRender] = useState(false);

  useEffect(() => {
    setRender(true);
  }, []);

  return render ? <>{children}</> : <>{loading}</>;
};
