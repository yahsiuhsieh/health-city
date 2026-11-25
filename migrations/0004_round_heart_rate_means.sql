UPDATE heart_rate_days
SET means = (
  SELECT json_group_array(value)
  FROM (
    SELECT CASE
      WHEN atom >= 0 AND atom * 100 < 9007199254740991
        THEN round(atom * 100 + min(atom * 100 * 2.220446049250313e-16, 1e-9)) / 100
      ELSE atom
    END AS value
    FROM json_each(heart_rate_days.means)
    ORDER BY key
  )
)
WHERE CASE WHEN json_valid(means) THEN json_type(means) = 'array' ELSE 0 END
  AND NOT EXISTS (
    SELECT 1 FROM json_each(means)
    WHERE type NOT IN ('integer', 'real', 'null') OR atom < 0
  )
  AND EXISTS (
    SELECT 1 FROM json_each(means)
    WHERE atom * 100 < 9007199254740991
      AND atom != round(atom * 100 + min(atom * 100 * 2.220446049250313e-16, 1e-9)) / 100
  );
