import React, { Suspense } from "react";

import { Table } from "@trussworks/react-uswds";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import EcrPaginationWrapper from "./components/EcrPaginationWrapper";
import EcrTableContent from "./components/EcrTableContent";
import { EcrTableHeader } from "./components/EcrTableHeader";
import { EcrTableLoading } from "./components/EcrTableLoading";
import Filters from "./components/Filters";
import Header from "./components/Header";
import LibrarySearch from "./components/LibrarySearch";
import { INITIAL_HEADERS } from "./constants";
import { getAllConditions } from "./data/conditions";
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
  }

  const cookieStore = cookies();
  const config = getLibraryConfig(searchParams, cookieStore);
  const filterConditionsArr = config.condition?.split("|");
  const filterDates = returnParamDates(config.dateRange, config.dates);

  const tableHeaders = INITIAL_HEADERS.map((header) => {
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
    <div className="display-flex flex-column height-viewport">
      <Header />
      <main className="overflow-auto height-full">
        <div className="margin-x-3 padding-y-105 display-flex flex-align-center">
          <h2 className="margin-bottom-0 text-bold font-sans-xl">
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
      <Table
        bordered={false}
        fullWidth={true}
        striped={true}
        fixed={true}
        className="table-ecr-library margin-0"
        data-testid="table"
      >
        {children}
      </Table>
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
