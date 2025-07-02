"use client";

import { useState, useEffect, useRef } from "react";

import { Search } from "@trussworks/react-uswds";

import { useLibraryQueryParam } from "@/app/hooks/useQueryParam";

interface LibrarySearchProps {
  initSearchTerm?: string;
  className?: string;
  textBoxClassName?: string;
}

/**
 * eCR Library search bar component
 * @param props - Properties to pass into
 * @param props.initSearchTerm - term to initialize the value with
 * @param props.className - The class name to pass into the USWDS search component
 * @param props.textBoxClassName - The class name to pass into the input props for the USWDS search component
 * @returns - Search bar component for the eCR Library
 */
const LibrarySearch = ({
  initSearchTerm,
  className,
  textBoxClassName,
}: LibrarySearchProps) => {
  const [searchTerm, setSearchTerm] = useState<string | undefined>();
  const prevSearchTermRef = useRef(searchTerm);
  const { updateQueryParam, pushQueryUpdate, deleteQueryParam } =
    useLibraryQueryParam();

  useEffect(() => {
    setSearchTerm(initSearchTerm);
  }, [initSearchTerm]);

  // UseEffect for detecting when the search input has been cleared through either clicking the X or hitting ESC
  // and re-triggering the search
  useEffect(() => {
    const prev = prevSearchTermRef.current;

    if (prev !== "" && searchTerm === "") {
      deleteQueryParam("search");
      pushQueryUpdate();
    }

    prevSearchTermRef.current = searchTerm;
  }, [searchTerm]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const searchParams = new URLSearchParams(window.location.search);
    const currentQuerySearch = searchParams.get("search") || "";

    if ((searchTerm ?? "") === currentQuerySearch) return;

    updateQueryParam("search", searchTerm ?? "");
    pushQueryUpdate();
  };

  return (
    <Search
      placeholder="Search by patient"
      onSubmit={handleSubmit}
      onChange={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
      defaultValue={ initSearchTerm ?? ""}
      size="small"
      large={true}
      className={className}
      inputProps={{
        className: textBoxClassName,
      }}
    />
  );
};

export default LibrarySearch;
