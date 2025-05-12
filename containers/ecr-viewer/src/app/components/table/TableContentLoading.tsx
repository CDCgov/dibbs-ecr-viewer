import { range } from "@/app/utils/data-utils";

/**
 * The Ecr Library table, but with blobs instead of data.
 * @returns - The JSX element representing the eCR table.
 */
export const EcrTableLoading = () => {
  return (
    <tbody data-testid="loading-table">
      {range(10).map((i) => {
        return (
          <BlobRow key={i} themeColor={i % 2 === 0 ? "gray" : "dark-gray"} />
        );
      })}
    </tbody>
  );
};

const Blob = ({ themeColor }: { themeColor: string }) => {
  return (
    <div className="grid-row">
      <div
        className={`loading-blob grid-col-8 loading-blob-${themeColor} width-full`}
      >
        &nbsp;
      </div>
    </div>
  );
};

const BlobRow = ({ themeColor }: { themeColor: string }) => {
  return (
    <tr>
      <td>
        <Blob themeColor={themeColor} />
      </td>
      <td>
        <Blob themeColor={themeColor} />
        <br />
        <Blob themeColor={themeColor} />
      </td>
      <td>
        <Blob themeColor={themeColor} />
        <br />
        <Blob themeColor={themeColor} />
      </td>
      <td>
        <Blob themeColor={themeColor} />
      </td>
      <td>
        <Blob themeColor={themeColor} />
      </td>
    </tr>
  );
};
