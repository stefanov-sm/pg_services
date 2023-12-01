select jsonb_build_object('arr', jsonb_agg(to_json(t)), 'scalar', null) from
(
 select seq running_number, to_char(seq, 'FMRN') as_roman_numeral
 from generate_series((:arg ->> 'lower_limit')::int, (:arg ->> 'upper_limit')::int, 1) seq
) t;