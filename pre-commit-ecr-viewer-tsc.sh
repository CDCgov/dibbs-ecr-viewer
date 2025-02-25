#!/bin/bash


( 
    cd containers/ecr-viewer;
    npm i;
    npm run lint:tsc 
)
