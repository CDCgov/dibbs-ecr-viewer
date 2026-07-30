FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

# Download FHIR-Converter

RUN git clone https://github.com/CDCgov/dibbs-FHIR-Converter.git --branch angela/fix-patient-deceased-dateTime --depth 1 /App

WORKDIR /App

RUN dotnet restore
RUN dotnet publish \
  src/Dibbs.FhirConverterApi/Dibbs.FhirConverterApi.csproj \
  -c Release \
  -r linux-x64 \
  --self-contained true \
  -o output

RUN apt-get update && apt-get install -y curl

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /App
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
COPY --from=build /App/output .
COPY --from=build /App/data/Templates ./templates
EXPOSE 8080

ENV TEMPLATES_PATH=./templates/eCR
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1
ENTRYPOINT ["dotnet", "Dibbs.FhirConverterApi.dll"]
