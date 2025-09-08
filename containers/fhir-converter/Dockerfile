FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

# Download FHIR-Converter
RUN git clone https://github.com/CDCgov/dibbs-FHIR-Converter.git --branch angela/1023-reportability-info-organizer --depth 1 /build/FHIR-Converter
# v7.0-16
# angela/1023-reportability-info-organizer

WORKDIR /App

RUN dotnet restore
RUN dotnet publish \
  src/Dibbs.FhirConverterApi/Dibbs.FhirConverterApi.csproj \
  -c Release \
  -r linux-x64 \
  --self-contained true \
  -o output

RUN apt-get update && apt-get install -y curl jq

# Get an up to date copy of active rxnorm codes and names
RUN rm output/rxnorm.csv
RUN curl 'https://rxnav.nlm.nih.gov/REST/allstatus.json?status=active' \
  | jq --raw-output '[["code", "name"]] + [.minConceptGroup.minConcept[] | [.rxcui, .name]] | .[] | @csv' \
  > output/rxnorm.csv

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /App
COPY --from=build /App/output .
COPY --from=build /App/data/Templates ./templates
EXPOSE 8080

ENV TEMPLATES_PATH=./templates/
ENTRYPOINT ["dotnet", "Dibbs.FhirConverterApi.dll"]