with t(arg) as
(
 select unnest(string_to_array(trim(:arg, ' /'), '/'))
)
select row_number() over () as seq, arg from t;