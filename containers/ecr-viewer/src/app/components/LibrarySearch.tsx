"use client";

import { Search } from "@trussworks/react-uswds";

import { useQueryParam } from "@/app/hooks/useQueryParam";

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
  const { updateQueryParam, pushQueryUpdate } = useQueryParam();

  return (
    <Search
      placeholder="Search by patient"
      onSubmit={(e) => {
        e.preventDefault();
        const searchTerm = (
          e.currentTarget.elements.namedItem("search-field") as HTMLInputElement
        )?.value;
        updateQueryParam("search", searchTerm);
        pushQueryUpdate();
      }}
      defaultValue={initSearchTerm}
      size="small"
      large={true}
      className={className}
      inputProps={{ className: textBoxClassName }}
    />
  );
};

export default LibrarySearch;
