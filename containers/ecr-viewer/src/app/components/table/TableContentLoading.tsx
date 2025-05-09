import { range } from "@/app/utils/data-utils";

/**
 * The Ecr Library table, but with blobs instead of data.
 * @param props React props
 * @param props.numColumns Number of columns in the loading table
 * @returns - The JSX element representing the eCR table.
 */
export const TableContentLoading = ({
  numColumns = 5,
}: {
  numColumns?: number;
}) => {
  return (
    <tbody data-testid="loading-table">
      {range(10).map((i) => {
        return (
          <BlobRow
            key={i}
            numColumns={numColumns}
            themeColor={i % 2 === 0 ? "gray" : "dark-gray"}
          />
        );
      })}
    </tbody>
  );
};

const Blob = ({ themeColor }: { themeColor: string }) => {
  return (
    <div className="grid-row">
      <div
        className={`loading-blob grid-col-4 loading-blob-${themeColor} width-full`}
      >
        &nbsp;
      </div>
    </div>
  );
};

const BlobRow = ({
  themeColor,
  numColumns,
}: {
  themeColor: string;
  numColumns: number;
}) => {
  return (
    <tr>
      {range(numColumns).map((i) => (
        <td key={`col-${i}`}>
          <Blob themeColor={themeColor} />
        </td>
      ))}
    </tr>
  );
};
