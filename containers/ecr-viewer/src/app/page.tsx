import React, { Suspense } from "react";

import { Table } from "@trussworks/react-uswds";
import { cookies } from "next/headers";
import { env } from "next-runtime-env";

import EcrPaginationWrapper from "./components/EcrPaginationWrapper";
import EcrTableContent from "./components/EcrTableContent";
import { EcrTableHeader } from "./components/EcrTableHeader";
import { EcrTableLoading } from "./components/EcrTableLoading";
import Filters from "./components/Filters";
import Header from "./components/Header";
import LibrarySearch from "./components/LibrarySearch";
import { DEFAULT_ITEMS_PER_PAGE, INITIAL_HEADERS } from "./constants";
import { getAllConditions } from "./data/conditions";
import NotFound from "./not-found";
import { getTotalEcrCount } from "./services/listEcrDataService";
import { returnParamDates } from "./utils/date-utils";

/**
 * Functional component for rendering the home page that lists all eCRs.
 * @param props - parameters from the HomePage
 * @param props.searchParams - list of search params
 * @returns The home page JSX component.
 */
const HomePage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) => {
  const isNonIntegratedViewer =
    env("NEXT_PUBLIC_NON_INTEGRATED_VIEWER") === "true";

  if (!isNonIntegratedViewer) {
    return <NotFound />;
  }

  const cookieStore = cookies();
  const prefItemsPerPage = cookieStore.get("itemsPerPage")?.value;
  const itemsPerPage =
    Number(searchParams?.itemsPerPage) ||
    Number(prefItemsPerPage) ||
    DEFAULT_ITEMS_PER_PAGE;

  const currentPage = Number(searchParams?.page) || 1;
  const sortColumn = (searchParams?.columnId as string) || "date_created";
  const sortDirection = (searchParams?.direction as string) || "DESC";
  const searchTerm = searchParams?.search as string | undefined;
  const filterConditions = searchParams?.condition as string | undefined;
  const filterConditionsArr = filterConditions?.split("|");
  const filterDates = returnParamDates(searchParams);

  const tableHeaders = INITIAL_HEADERS.map((header) => {
    return {
      ...header,
      sortDirection: header.id === sortColumn ? sortDirection : "",
    };
  });

  const totalCount = await getTotalEcrCount(
    filterDates,
    searchTerm,
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
            className="margin-left-auto"
            textBoxClassName="width-21-9375"
          />
        </div>
        <Filters conditions={allConditions} />
        <EcrPaginationWrapper
          totalCount={totalCount}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
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
                key={JSON.stringify({ ...searchParams, itemsPerPage })}
                fallback={<EcrTableLoading />}
              >
                <EcrTableContent
                  currentPage={currentPage}
                  itemsPerPage={itemsPerPage}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  searchTerm={searchTerm}
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
        <span className="text-bold font-body-lg">
          No eCRs found. We couldn't find any eCRs matching your filter or
          search critera.
        </span>
      </td>
    </tr>
  </tbody>
);

export default HomePage;
