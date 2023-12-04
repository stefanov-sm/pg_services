# ***pg_services*** - web services in SQL
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
## Server configuration

Server configuration resides in folder `config` above the base folder. It comprises of these files:
 - File _config/db.connection.config_ (optional)  
   contains a node-postgres [connection string](https://node-postgres.com/features/connecting#connection-uri) (for performance purposes consider connection pooling).
```text
postgresql://
<username>:<password>@
<host>:<port>/
<database>
```
If this file is missing then [environment variables](https://node-postgres.com/features/connecting#environment-variables) are used.
- File _config/logger.sql.config_ (optional)  
   contains a parameterized SQL query with exactly three parameters:  
   _caller IP address_, _service name_ and _call arguments_.

```sql
INSERT INTO tests.pg_services_log (call_by, call_resource, call_payload)
VALUES ($1, $2, $3);
```
 - File _log.table.sql_, sample log table DDL (you must create one so that the logger SQL query can work)
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

Service definitions reside in folder `services` above the base folder. Each service definition comprises of these two files:
 - `<service_name>.config.json` - contains the service manifest
 - `<query_file_name>.sql` - contains the service query
 
_The service example executes a parametrized SQL query and returns a table._  
_See demo.config.json and demo.sql in the example below._

`<query_file_name>.sql` file contains a single parameterized SQL query. Advanced SQL features (CTEs, window functions, etc.) and database server programming (stored procedures/functions) alike can be used in order to implement complex data logic.

`<service_name>.config.json` file contains the service manifest (metadata and arguments' definitions).  

### Manifest file _services/demo.config.json_  
Contains a JSON object
```json
{
  "settings":
  {
    "method": "POST",
    "token": "PTn456KSqqU7WhSszSe",
    "extsyntax": false,
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

- **method** - mandatory text, the HTTP request method. May be `POST` or `GET`, upper case.  
- **token** - mandatory text, a _Bearer authorization token_. The example was generated by [Random.org](https://www.random.org/passwords/?num=1&len=24&format=plain&rnd=new).  
- **extsyntax** - optional boolean, default `false`. Sets "extended" SQL query parameter syntax. Applies to `POST` services only. See below.
- **query** - the service SQL query file name, relative to `services` folder.
- **response** - mandatory text, one of the predefined response modes listed below  

|mode| description|
|---|---|
|"table"| for row set returning queries. Rows are retrieved by `PDOStatement::fetchAll()` method and sent as an array of JSON objects|
|"row"| for single row returning queries. A single row is retrieved by `PDOStatement::fetch()` method and sent as a JSON object|
|"value"| for value returning queries. A single value is retrieved by `PDOStatement::fetchColumn()` method and sent as is|
|"void"| null is returned|
- **iplist** - optional array of text representing IP addresses and ranges. If present then only caller IPs within these ranges are allowed  

> [!IMPORTANT]
> - Service manifests and SQL query files must be UTF-8 encoded.  
> - Service manifests are not checked for validity at runtime and therefore **must** be strictly validated at service setup time. Jsonschema `manifest.schema.json` to be used with an online [schema validator](https://www.jsonschemavalidator.net/) and `manifest.validator.js` CLI script are provided for the purpose. 

### *arguments* section  
> [!NOTE]
> Applies to `POST` services only. The section shall be left empty for `GET` services, `"arguments": {}"`

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
> [!NOTE]
> Either "default" or "constant" or none of them may be specified but not both  

### Query file _services/queries/demo.sql_  
Contains a parameterized SQL query
```sql
WITH t (running_number) AS
(
  SELECT generate_series((:arg ->> 'lower_limit')::integer, (:arg ->> 'upper_limit')::integer, 1)
)
SELECT (:arg ->> 'label') AS label, running_number, to_char(running_number, 'FMRN') AS roman_numeral
FROM t;
```
### SQL query parameter syntax  
#### basic syntax (default)  
- The SQL query shall have exactly one parameter: `:arg`, case insensitive;
- For POST requests `:arg` contains the request payload as `JSONB`;
- For GET requests `:arg` contains the trailing part of the request URL after the service name as `text`;
- Service **get_demo** illustrates the use of GET parameters.  
#### extended syntax (POST requests only)  
The SQL query uses parameter tags like `:__<PARAMETER_NAME>__` in upper case where parameter names correspond to request JSON attributes; Parameter tags are expanded to `text` expressions at runtime. Below is the extended parameter syntax version of file _demo.sql_.
```sql
WITH t (running_number) AS
(
  SELECT generate_series(:__LOWER_LIMIT__::integer, :__UPPER_LIMIT__::integer, 1)
)
SELECT :__LABEL__ AS label, running_number, to_char(running_number, 'FMRN') AS roman_numeral
FROM t;
```
Besides better readability, extended syntax allows queries to be debugged and optimized in a [SQL client](https://dbeaver.io/) before deployment.  
Service **xt_demo** illustrates the use of extended parameter syntax.  
> [!NOTE]
> Although SQL injection is taken care about by using prepared statements, an extra line of defence is never one too many. Therefore using regular expression patterns for text arguments' validation in manifest files is always a good idea.

## Logging

- Activity is logged by invoking the SQL query in `config/logger.sql.config` file (if any) for every call;
- Errors are logged in file `log/error.log`.

## Service invocation
 - URL `<base_url>[:<port>]/services/<service_name>[<querystring>]`
 - The security token is sent as `Authorization: Bearer` request header
 - Method `POST`: call arguments are POST-ed as JSON, querystring (if any) is ignored
 - Method `GET`: call arguments (if any) are passed as querystring, request body (if any) is ignored

## cURL
```
curl -X POST -H 'Authorization: Bearer PTn456KSqqU7WhSszSe' -i http://localhost:881/services/demo --data '{
 "lower_limit": 28,
 "label": "A sample record"
}'
```

## Service response

JSON with this structure:

```text
{
 "status": true or false,
 "data": return data in JSON or error text
}
```

![image](https://github.com/stefanov-sm/pg_services/assets/26185804/6f449df3-704e-4455-93f3-4263bdfe6491)

![image](https://github.com/stefanov-sm/pg_services/assets/26185804/54f7d56c-bfda-4b63-8bbc-e3161309b589)
