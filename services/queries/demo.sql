WITH t (running_number) AS
(
  SELECT generate_series((:arg ->> 'lower_limit')::integer, (:arg ->> 'upper_limit')::integer, 1)
)
SELECT (:arg ->> 'label') AS label, running_number, to_char(running_number, 'FMRN') AS roman_numeral
FROM t;