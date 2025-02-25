#!/bin/bash


( 
    cd containers/ecr-viewer;
    npm run lint:tsc 
)
