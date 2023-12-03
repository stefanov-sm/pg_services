# ***pg_services*** - RESTful web services in SQL
### PostgreSQL query-to-web-service generator under node.js  


## About
***pg_services*** is a simple __vanilla platform with no dependencies__ that wraps and exposes parameterized SQL queries as JSON web services in a flexible and secure way. 
The implementation and sample services run on [node.js](https://nodejs.org) and [PostgreSQL](https://www.postgresql.org/).  

Here is an example. Consider this JSON object and this trivial parameterized query with the object as an argument:
```
{
 "lower_limit": 28,
 "upper_limit: 30,
 "label": "A sample record"
}
```
```sql
WITH t (running_number) AS
(
  SELECT generate_series((:arg ->> 'lower_limit')::integer, (:arg ->> 'upper_limit')::integer, 1)
)
SELECT (:arg ->> 'label') AS label, running_number, to_char(running_number, 'FMRN') AS roman_numeral
FROM t;
```
Let's make a web service out of them. After the query is run then the raw resultset would be
|label          |running_number|roman_numeral|
|---------------|--------------|-------------|
|A sample record|            28|XXVIII       |
|A sample record|            29|XXIX         |
|A sample record|            30|XXX          |

As a JSON array (this would be part of the service response data) the resultset would be
```json
[
  {
    "label": "A sample record",
    "running_number": 28,
    "roman_numeral": "XXVIII"
  },
  {
    "label": "A sample record",
    "running_number": 29,
    "roman_numeral": "XXIX"
  },
  {
    "label": "A sample record",
    "running_number": 30,
    "roman_numeral": "XXX"
  }
]
```
The service definition comprises of the parameterized sql query in a text file and a service manifest file called `<service_name>.config.json` that references the sql file. One sql file may be referred to by more than one manifest. The following response modes are supported:

 - returning the entire query rowset as a JSON array of objects
 - returning a single row as a JSON object
 - returning a single value as is
 - returning no result (null)

## Server deployment on node.js and PostgreSQL
- Download ***pg_services***;
- Make a base folder for the server, `d:\NodeJS files\test` in the example below;
- Extract the ***pg_services*** files and folders into it;
- Either modify `include/db.connection.config` or delete it and set environment variables to [connect](https://node-postgres.com/features/connecting) to your PostgreSQL database;
- Either create an activity log database table (see `config/log.table.sql`) and modify `config/logger.sql.config` accordingly (see below) or rename/remove `config/logger.sql.config` to disable activity logging;
- From the command line run `node path_to/pg_services.js port_to_listen`;
- `port_to_listen` is optional, default 880.
- Folder contents and structure 
```text
<base folder> (d:\NodeJS files\test)
             ├file 'pg_servces.js'
             ├file 'helpers.js'
             ├file 'manifest.validator.js'
             ├file 'manifest.schema.json'
             ├file 'arguments.schema.js'
             ├folder 'config'
             │       ├file 'db.connection.config'
             │       ├file 'logger.sql.config'
             │       └file 'log.table.sql'
             ├folder 'services'
             │       ├file 'demo.config.json'
             │       ├file 'get_demo.config.json'
             │       └folder 'queries'
             │               ├file 'demo.sql'
             │               └file 'get_demo.sql'
             └folder 'log'
                     └file 'error.log'
```
![image](https://github.com/stefanov-sm/pg_services/assets/26185804/6f449df3-704e-4455-93f3-4263bdfe6491)

![image](https://github.com/stefanov-sm/pg_services/assets/26185804/54f7d56c-bfda-4b63-8bbc-e3161309b589)
## Details and reference

