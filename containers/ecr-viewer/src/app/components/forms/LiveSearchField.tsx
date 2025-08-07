import { TextInput } from "@trussworks/react-uswds";

import { Search } from "@/app/components/Icon";
import { makePlural, toKebabCase } from "@/app/utils/format-utils";

/**
 * Component for live (non-submitted) search. Has the capability to display the number
 * of results when a search term is entered.
 * @param props react props
 * @param props.searchTerm current search term value
 * @param props.setSearchTerm handler for search term change
 * @param props.label label of the field (also used for placeholder and id)
 * @param props.numResults Optionally, display this number of results when non-empty
 * @param props.className Optionally, classname to pass to the outer div
 * @returns styled live search component
 */
export const LiveSearchField = ({
  searchTerm,
  setSearchTerm,
  label,
  numResults,
  className,
}: {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  label: string;
  numResults?: number;
  className?: string;
}) => {
  return (
    <div className={`live-search ${className}`}>
      {searchTerm && numResults && (
        <p aria-live="polite" className="result-count">
          {numResults} result{makePlural(numResults)}
        </p>
      )}
      <Search aria-hidden={true} className="square-3 text-base" />
      <TextInput
        type="search"
        aria-label={label}
        id={toKebabCase(label)}
        name={toKebabCase(label)}
        placeholder={label}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
    </div>
  );
};

export default LiveSearchField;
