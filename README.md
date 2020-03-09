# geostore

- Upload geometry files into PostGIS
- Expose a query endpoint for loaded data (by geometry intersection or by indexed feature keys)
- Expose WMS/WM\* endpoints for loaded data

## Initial setup

`docker-compose` file has setup for Postgresql database dependency and mapserver.

- docker-compose up
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
