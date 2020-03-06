# geostore

## Initial setup

`docker-compose` file has setup for Postgresql database dependency.

- yarn
- yarn start

Launch will fail, creating an `envfile.env` file to be edited.

- yarn orm migration:up

- yarn start again

## Useful commands

**yarn start:dev** Dev server with nodemon

**yarn orm migration:create** Creates migration file. NOTES: Seems to use **current db state** as source for diff. Also, migration statements **must** me revised.

**yarn orm migration:up** Runs pending migrations.

## Swagger endpoint

`/api`
