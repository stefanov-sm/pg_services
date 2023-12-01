# ***pg_services*** - RESTful web services in SQL
### PostgreSQL query to  service generator under node.js  


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
The service definition would comprise of the parameterized sql query in a text file and a service manifest file called `<service_name>.config.json` that references the sql file. One sql file may be referred to by more than one service definition. The following response modes are supported:

 - returning the entire query rowset as a JSON array of objects
 - returning a single row as a JSON object
 - returning a single value as is
 - returning no result (null)

## Server deployment on node.js and PostgreSQL
- Download ***pg_services***;
- Make a base folder for the server;
- Extract the ***pg_services*** files and folders into it;
- Either modify `include/db.connection.config` or delete it and set environment variables to [connect](https://node-postgres.com/features/connecting) to your PostgreSQL database;
- Either create an activity log database table (see `config/log.table.sql`) and modify `config/logger.sql.config` accordingly (see below) or rename/remove `config/logger.sql.config` to disable activity logging
- From the command line run `node path_to/pg_services.mjs port_to_listen`;
- `port_to_listen` is optional, default 880.

![image](https://github.com/stefanov-sm/pg_services/assets/26185804/baa4f4ba-4c00-4c24-bf2b-6032d2fa23cb)

### ... more to come here ...
Now the details  

![image](https://github.com/stefanov-sm/pg_services/assets/26185804/54f7d56c-bfda-4b63-8bbc-e3161309b589)

