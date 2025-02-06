FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

# Download FHIR-Converter
RUN git clone https://github.com/CDCgov/dibbs-FHIR-Converter.git --branch v7.0-1 --depth 1 /build/FHIR-Converter

WORKDIR /build/FHIR-Converter

# For sanity checking github actions caching
RUN git log --pretty=oneline -2

RUN echo test > src/Microsoft.Health.Fhir.TemplateManagement.UnitTests/TestData/DecompressedFiles/VXU_V04.liquid
RUN if [ -f src/Microsoft.Health.Fhir.TemplateManagement.UnitTests/TestData/DecompressedFiles/.wh.VXU_V04.liquid ]; then rm src/Microsoft.Health.Fhir.TemplateManagement.UnitTests/TestData/DecompressedFiles/.wh.VXU_V04.liquid; fi

# Build Microsoft FHIR Converter
RUN dotnet clean
RUN dotnet publish \
  src/Microsoft.Health.Fhir.Liquid.Converter.Tool/Microsoft.Health.Fhir.Liquid.Converter.Tool.csproj \
  -c Release \
  -r linux-x64 \
  --self-contained true \
  -o output

# Set up python Server
FROM python:3.10-slim AS runtime

# Copy FHIR-Converter binary from build stage
COPY --from=build /build/FHIR-Converter/output /build/FHIR-Converter/output
COPY --from=build /build/FHIR-Converter/data/Templates /build/FHIR-Converter/data/Templates

# # Install python via pyenv
RUN apt-get update && apt-get install -y curl jq libicu-dev

# Get an up to date copy of active rxnorm codes and names
RUN rm /build/FHIR-Converter/output/rxnorm.csv
RUN curl 'https://rxnav.nlm.nih.gov/REST/allstatus.json?status=active' \
  | jq --raw-output '[["code", "name"]] + [.minConceptGroup.minConcept[] | [.rxcui, .name]] | .[] | @csv' \
  > /build/FHIR-Converter/output/rxnorm.csv

# Install requirements
WORKDIR /code

# Set --build-arg CACHBUSTSERVICE=<random number here> to only invalidate the python code installation
ARG CACHEBUSTSERVICE=1

COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy FastAPI app
COPY app /code/app
COPY assets /code/assets
COPY README.md /code/README.md

EXPOSE 8080
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
