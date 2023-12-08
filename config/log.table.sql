create table tests.pg_services_log 
(
 call_time timestamp with time zone not null default current_timestamp,
 service_name text not null,
 call_by text not null,
 call_method text not null,
 call_payload text not null,
 constraint pg_services_log_pk primary key (service_name, call_method, call_time)
);
