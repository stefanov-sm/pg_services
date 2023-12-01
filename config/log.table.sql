create table tests.pg_services_log 
(
 call_time timestamptz not null default current_timestamp,
 call_by text not null,
 call_resource text not null,
 call_payload text not null,
 constraint pg_services_log_pk primary key (call_resource, call_by, call_time)
);