import React, { Suspense } from "react";

import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { dbIsValid } from "./api/migrate-db/migrate";
import { MetadataDbInvalid } from "./components/ErrorPage";
import Filters from "./components/Filters";
import LibrarySearch from "./components/LibrarySearch";
import { EcrTableLoading } from "./components/table/TableContentLoading";
import EcrPaginationWrapper from "./components/table/ecr/EcrPaginationWrapper";
import EcrTableContent from "./components/table/ecr/EcrTableContent";
import { EcrTableHeader } from "./components/table/ecr/EcrTableHeader";
import { INITIAL_HEADERS } from "./constants";
import { getAllConditions } from "./services/listConditionsService";
import { getTotalEcrCount } from "./services/listEcrDataService";
import { returnParamDates } from "./utils/date-utils";
import { PageSearchParams, getLibraryConfig } from "./utils/search-param-utils";

/**
 * Functional component for rendering the home page that lists all eCRs.
 * @param props - parameters from the HomePage
 * @param props.searchParams - list of search params
 * @returns The home page JSX component.
 */
const HomePage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  if (!process.env.METADATA_DATABASE_TYPE) {
    notFound();
  } else if (!(await dbIsValid())) {
    return <MetadataDbInvalid />;
  }

  const cookieStore = cookies();
  const config = getLibraryConfig(searchParams, cookieStore);
  const filterConditionsArr = config.condition?.split("|");
  const filterDates = returnParamDates(config.dateRange, config.dates);

  const tableHeaders: typeof INITIAL_HEADERS = INITIAL_HEADERS.map((header) => {
    return {
      ...header,
      sortDirection: header.id === config.columnId ? config.direction : "",
    };
  });

  const totalCount = await getTotalEcrCount(
    filterDates,
    config.search,
    filterConditionsArr,
  );

  const allConditions = await getAllConditions();

  return (
    <div className="display-flex flex-column height-viewport-header-footer">
      <main className="overflow-auto height-full">
        <div className="margin-x-3 padding-y-105 display-flex flex-align-center">
          <h2
            data-testid="ecr-library-header"
            className="margin-bottom-0 text-bold font-sans-xl"
          >
            eCR Library
          </h2>
          <LibrarySearch
            initSearchTerm={config.search}
            className="margin-left-auto"
            textBoxClassName="width-21-9375"
          />
        </div>
        <Filters
          allConditions={allConditions}
          initConditions={filterConditionsArr ?? allConditions}
          initCustomDate={config.dates}
          initDateRange={config.dateRange}
        />
        <EcrPaginationWrapper
          totalCount={totalCount}
          itemsPerPage={config.itemsPerPage}
          currentPage={config.page}
        >
          <EcrTableWrapper>
            <EcrTableHeader
              headers={tableHeaders}
              disabled={totalCount === 0}
            />
            {totalCount === 0 ? (
              <EcrTableNoData />
            ) : (
              <Suspense
                // key needed to force fallback state to retrigger on params change
                key={JSON.stringify(config)}
                fallback={<EcrTableLoading />}
              >
                <EcrTableContent
                  currentPage={config.page}
                  itemsPerPage={config.itemsPerPage}
                  totalEcrCount={totalCount}
                  sortColumn={config.columnId}
                  sortDirection={config.direction}
                  searchTerm={config.search}
                  filterConditions={filterConditionsArr}
                  filterDates={filterDates}
                />
              </Suspense>
            )}
          </EcrTableWrapper>
        </EcrPaginationWrapper>
      </main>
    </div>
  );
};

/**
 * Styled wrapper for the EcrTable. Expects the children to handle adding
 * the headers and body
 * @param params React params
 * @param params.children The header and body content
 * @returns A table shell
 */
const EcrTableWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="ecr-library-wrapper width-full overflow-auto">
      <table
        id="treegrid-table"
        role="treegrid"
        aria-label="eCR Library Results"
        aria-readonly="true"
        className="usa-table usa-table--borderless width-full table-ecr-library margin-0"
      >
        {children}
      </table>
    </div>
  );
};

const EcrTableNoData = () => (
  <tbody>
    <tr>
      <td colSpan={999} className="text-middle text-center height-card">
        <span className="text-bold font-body-lg" tabIndex={0}>
          No eCRs found. We couldn't find any eCRs matching your filter or
          search criteria.
        </span>
      </td>
    </tr>
  </tbody>
);

export default HomePage;
