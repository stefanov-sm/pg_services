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
## Server configuration

Server configuration resides in folder `config` above base folder. It comprises of these files:
 - File _db.connection.config_ (optional)  
   contains a node-postgres [connection string](https://node-postgres.com/features/connecting#connection-uri) **(for performance purposes consider connection pooling)**.
```text
postgresql://
<username>:<password>@
<host address>:6432/
<database name>
```
If this file is missing then [environment variables](https://node-postgres.com/features/connecting#environment-variables) are used.
- File _logger.sql.config_ (optional)  
   contains a parameterized SQL query with exactly three parameters:  
   _caller IP address_, _service name_ and _call arguments_.

```sql
INSERT INTO tests.pg_services_log (call_by, call_resource, call_payload)
VALUES ($1, $2, $3);
```
 - File _log.table_sql_, sample log table DDL **(you must create one so that the logger SQL query can work)**
```sql
create table tests.pg_services_log 
(
 call_time timestamptz not null default current_timestamp,
 call_by text not null,
 call_resource text not null,
 call_payload text not null,
 constraint pg_services_log_pk primary key (call_resource, call_by, call_time)
);
```
## Service definition

Service definitions reside in `services` (i.e. `<service config>`) folder. Each comprises of these three files:
 - `<service_name>.config.json` - mandatory, contains the service manifest
 - `<sql_file_name>.sql` - mandatory, contains the service query
 
_The service example executes a parametrized SQL query and returns a table._  
_See demo.config.json and demo.new.sql in the example below._

`<sql_file_name>.sql` file contains a single parameterized SQL query. Advanced SQL features (CTEs, window functions, etc.) and database server programming (stored procedures/functions) alike can be used in order to implement complex data logic.

`<service_name>.config.json` file contains service metadata and arguments' definitions.  

___

**NOTE:**
- A JSON schema file for validation of `<service_name>.config.json` files and a CLI script for generating runtime arguments' validation JSON schema are available in [resources](resources) folder. 
- A web GUI for testing and debugging is available in [restclient](examples/restclient) folder. 

___

- File _demo.config.json_
```json
{
  "settings":
  {
    "method": "POST",
    "token": "PTn456KSqqU7WhSszSe",
    "query": "queries/demo.sql",
    "response": "table",
    "iplist": ["172.30.0.0/25", "172.30.0.132", "127.0.0.1"]
  },
  "arguments":
  {
    "lower_limit": {"type": "number", "default": 25},
    "upper_limit": {"type": "number", "constant": 30},
    "label":       {"type": "text",   "default": "Just a label", "pattern": "^[A-ZА-Я 0-9]+$"}
  }
}
```
### *settings* section

- **method** - mandatory text. May be `POST` or `GET`.  
Example: `"method": "POST"`  

- **token** - mandatory text, a security token. The example was generated by [Random.org](https://www.random.org/passwords/?num=1&len=24&format=plain&rnd=new).  
 The same token value must be used to both define and invoke the service.  
Example: `"token": "PTn456KSqqU7WhSszSe"`  

- **query** - mandatory text, the file name of the service sql query  
Example: `"query": "demo.sql"`  

- **response** - mandatory text, one of the predefined response modes listed below  

|mode| description|
|---|---|
|"table"| for row set returning queries. Rows are retrieved by `PDOStatement::fetchAll()` method and sent as an array of JSON objects|
|"row"| for single row returning queries. A single row is retrieved by `PDOStatement::fetch()` method and sent as a JSON object|
|"value"| for value returning queries. A single value is retrieved by `PDOStatement::fetchColumn()` method and sent as is|
|"void"| null is returned|

Example: `"response": "table"`  

- **iplist** - optional array of text representing IP ranges. If present then only caller IPs within these ranges are allowed  
Example: `"iplist": ["172.30.0.0/25", "172.30.0.132", "127.0.0.1"]`  


### *arguments* section

Service arguments are defined as `"argument_name": <argument description>`

argument description attributes:

|Attribute | Required | Type | Description|
|---|---|---|---|
|"type"|Yes|text|Argument data type. One of "number", "text", "boolean"|
|"default"|No|varying|Default value. Makes the service argument optional|
|"constant"|No|varying|Non-overridable default value|
|"pattern"|No|text|Regular expression for validation. Applicable to text arguments only|

```text
Example: "lower_limit": {"type": "number", "default": 25}
Example: "upper_limit": {"type": "number", "constant": 30}
Example: "label":       {"type": "text", "default": "Just a label", "pattern": "/^[A-ZА-Я 0-9]+$/ui"}
```
**NOTE:** Either "default" or "constant" or none of them may be specified but not both  
**NOTE:** The `u` regex switch enables extended (cyrillic, greek, accented) characters matching.
 - File _demo.new.sql_

```sql
SELECT
    cast(:label AS text) AS "Етикет",
    current_number AS "Tom",
    to_char(current_number, 'FMRN') AS "Jerry"
 FROM generate_series (1, 1000, 1) AS t (current_number)
 WHERE current_number BETWEEN :lower_limit AND :upper_limit
 LIMIT 100;
```
**NOTE:** Arguments in .config.json and parameters in .sql files must match exactly by name and number. SQL parameter names are prefixed with a colon (:).


