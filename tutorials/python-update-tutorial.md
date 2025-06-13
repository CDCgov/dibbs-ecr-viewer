# Python Upgrade Process

The python upgrade process involves updating the python version in multiple places to ensure that the build runs correctly.

## pyproject.toml

Upgrading pyproject.toml is straightforward, update the python version number to your specified version.

## workflow tests

Update the `TEST_RUNNER_PYTHON_VERSION` to your new python version in all of the `testContainer____.yaml` files.

## Changing Docker

For each of the Docker files, update the FROM python to your desire version number. Check the Docker website to ensure that the desired version number is supported.

The Docker files that need to be changed are

- containers/alerts/DockerFile
- containers/ingestion/DockerFile
- containers/message-parser/DockerFile
- containers/record-linkage/DockerFile
- containers/tabulation/DockerFile
- containers/validation/DockerFile
