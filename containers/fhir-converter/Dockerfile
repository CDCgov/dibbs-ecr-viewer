FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

# Download FHIR-Converter

RUN git clone https://github.com/CDCgov/dibbs-FHIR-Converter.git --branch 8.8.5 --depth 1 /App

WORKDIR /App

RUN dotnet restore
RUN dotnet publish \
  src/Dibbs.FhirConverterApi/Dibbs.FhirConverterApi.csproj \
  -c Release \
  -r linux-x64 \
  --self-contained true \
  -o output

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /App
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
COPY --from=build /App/output .
COPY --from=build /App/data/Templates ./templates

# Fail the build if either distrusted root is left in any CA bundle, whether from
# the OS or vendored by a Python package. Each pattern is one line of a root's
# base64 body (emSign ECC Root CA - G3, then AAA Certificate Services), so it
# matches however a bundle labels the certificate. grep exits 1 only when
# nothing matched.
RUN grep -rlF \
  -e 'CUfvO6wIBHxcmbHtRwfSAjEAnbpV/KlK6O3t5nYBQnvI+GDZjVGLVTv7jHvrZQnD' \
  -e 'l2D4kF501KKaU73yqWjgom7C12yxow+ev+to51byrvLjKzg6CYG1a4XXvi3tPxq3' \
  /etc /usr /var; \
  test $? -eq 1
EXPOSE 8080

ENV TEMPLATES_PATH=./templates/eCR
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1
ENTRYPOINT ["dotnet", "Dibbs.FhirConverterApi.dll"]
