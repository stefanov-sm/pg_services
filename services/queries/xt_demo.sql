WITH t (running_number) AS
(
  SELECT generate_series(:__LOWER_LIMIT__::integer, :__UPPER_LIMIT__::integer, 1)
)
SELECT :__LABEL__ AS label, running_number, to_char(running_number, 'FMRN') AS roman_numeral
FROM t;