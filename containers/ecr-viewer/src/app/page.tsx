import React, { Suspense } from "react";
import Header from "./Header";
import { getTotalEcrCount } from "@/app/services/listEcrDataService";
import EcrPaginationWrapper from "@/app/components/EcrPaginationWrapper";
import EcrTable from "@/app/components/EcrTable";
import LibrarySearch from "./components/LibrarySearch";
import NotFound from "./not-found";
import Filters from "@/app/components/Filters";
import { EcrTableLoading } from "./components/EcrTableClient";
import { returnParamDates } from "@/app/utils/date-utils";
import { env } from "next-runtime-env";
import { getAllConditions } from "./data/conditions";

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

  const currentPage = Number(searchParams?.page) || 1;
  const itemsPerPage = Number(searchParams?.itemsPerPage) || 25;
  const sortColumn = (searchParams?.columnId as string) || "date_created";
  const sortDirection = (searchParams?.direction as string) || "DESC";
  const searchTerm = searchParams?.search as string | undefined;
  const filterConditions = searchParams?.condition as string | undefined;
  const filterConditionsArr = filterConditions?.split("|");
  const filterDates = returnParamDates(searchParams);

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
        <EcrPaginationWrapper totalCount={totalCount}>
          <Suspense fallback={<EcrTableLoading />}>
            <EcrTable
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              searchTerm={searchTerm}
              filterConditions={filterConditionsArr}
              filterDates={filterDates}
            />
          </Suspense>
        </EcrPaginationWrapper>
      </main>
    </div>
  );
};

export default HomePage;
