###
<!-- how to start with backend -->
1.initiate pnpm  to install packege.json
2.then we  install dependencies eg doten pg drizzle orm
3.then  from there install the typesdependencies  typescript,tsc  types/node ypes/pg
4.then  initialize typescript in order to get ts.config through pnpm tsc fragment*2tsc
5. then add scriptsin the package.json run dev

<!-- Create a schema -->

<!-- How to create a db.ts -->
1. Get the Necessary imports, (schema,Client)
2. Instantiate the client
3. Connecting our db
4. Catch the errors
5. Instantiate db with drizzle
6. We create an export for the db

<!-- How  to create a drizzle.config.ts -->
1. Get the Necessary Imports  (define config)
2. Define the define config with  the  dialect,schema,out  and db credentials
3. define the verbose for  seeing  what happening and also the strict property for strict typechecking!

<!-- After this your ready to generate a sql -->

<!-- How  to create A migration -->