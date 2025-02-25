#!/bin/bash


( 
    cd containers/ecr-viewer;
    npm ci;
    npm run lint:tsc 
)
