WITH caudales_last AS (
         SELECT series.estacion_id AS unid,
            observaciones.timestart,
            series.id AS series_id,
            valores_num.valor
           FROM estaciones_view,
            series,
            observaciones,
            valores_num
          WHERE estaciones_view.sitecode=series.estacion_id AND estaciones_view.public=true AND series.id = observaciones.series_id AND observaciones.id = valores_num.obs_id AND series.var_id = 4 AND (series.proc_id = ANY (ARRAY[1, 2])) AND series.unit_id = 10 
          AND observaciones.timestart >= case when '%timeStart%'='1800-01-01' 
                                        then current_timestamp-'7 days'::interval
                                        else '%timeStart%'::timestamp end
       	  AND observaciones.timeend <= case when '%timeEnd%' = '1800-01-01' 
	                                  then current_timestamp
	                                  else '%timeEnd%'::timestamp end
	      AND estaciones_view.redid= CASE WHEN %redid%!=0 THEN %redid% ELSE estaciones_view.redid END 
	      AND estaciones_view.tipo= CASE WHEN '%tipo%' != 'X' THEN '%tipo%' else estaciones_view.tipo END
        ), ult AS (
         SELECT caudales_last.unid,
            max(caudales_last.timestart) AS date,
            caudales_last.series_id,
            array_agg(array[to_char(timestart::timestamp at time zone 'ART','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),round(valor::numeric,2)::text] order by timestart) AS timeseries,
            to_char(min(timestart::timestamp at time zone 'ART'),'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') timestart,
            to_char(max(timestart::timestamp at time zone 'ART'),'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') timeend
           FROM caudales_last
          WHERE caudales_last.valor IS NOT NULL 
          GROUP BY caudales_last.unid, caudales_last.series_id
        ), ult_v AS (
         SELECT ult_1.unid,
            ult_1.date,
            caudales_last.valor
           FROM ult ult_1,
            caudales_last
          WHERE ult_1.unid = caudales_last.unid AND caudales_last.timestart = ult_1.date
        ), v AS (
         SELECT ult_v.unid,
            ult_v.date,
            ult_v.valor,
            round(avg(caudales_last.valor)::numeric, 2) AS valor_precedente
           FROM ult_v
             LEFT JOIN caudales_last ON ult_v.unid = caudales_last.unid AND caudales_last.timestart <= (ult_v.date - '1 day'::interval) AND caudales_last.timestart > (ult_v.date - '2 days'::interval)
          GROUP BY ult_v.unid, ult_v.date, ult_v.valor
        ), n AS (
         SELECT v.unid,
            v.date,
            v.valor,
            v.valor_precedente,
                CASE
                    WHEN round(v.valor::numeric, 2) > round(v.valor_precedente, 2) THEN 'crece'::text
                    WHEN round(v.valor::numeric, 2) = round(v.valor_precedente, 2) THEN 'permanece'::text
                    ELSE 'baja'::text
                END AS tendencia
           FROM v
          GROUP BY v.unid, v.date, v.valor, v.valor_precedente, (
                CASE
                    WHEN round(v.valor::numeric, 2) > round(v.valor_precedente, 2) THEN 'crece'::text
                    WHEN round(v.valor::numeric, 2) = round(v.valor_precedente, 2) THEN 'permanece'::text
                    ELSE 'baja'::text
                END)
          ORDER BY v.unid
  ), percentiles AS (
    SELECT *
    FROM series_percentiles_ref
    UNION ALL (
        SELECT
            series_id,
            100,
            '-Infinity'::float8
        FROM series_percentiles_ref 
        WHERE percentil=5
    )
  ), dist AS (
  SELECT n.unid,
      timezone('ART'::text, n.date) AS fecha,
      n.valor,
      n.valor_precedente,
      n.tendencia,
      estaciones.nombre,
      estaciones.tabla,
      estaciones.geom,
      estaciones.rio,
      ult.series_id,
      to_json(ult.timeseries)::text timeseries,
      ult.timestart,
      ult.timeend,
      percentiles.percentil
    FROM n
    JOIN estaciones ON (n.unid = estaciones.unid)
    JOIN ult ON (estaciones.unid = ult.unid)
    LEFT JOIN percentiles ON (percentiles.series_id=ult.series_id AND n.valor >= percentiles.valor)
 ORDER BY estaciones.tabla asc, n.unid asc, percentiles.valor desc      
  ), rio_mapping(key, value) AS (
  VALUES 
   ('PARANAMED', 'Paraná'),
    ('BARRANQUERAS', 'Paraná'),
    ('PARANAINF', 'Paraná'),
    ('SANJAVIER', 'Paraná'),
    ('VICTORIA', 'Paraná/Delta'),
    ('PARAGUAY', 'Paraguay'),
    ('URUGUAY', 'Uruguay'),
    ('PARANASUP', 'Alto Paraná')
 ), status_categories(key, value) AS (
  VALUES 
    (5, 'aguas altas'),
    (25, 'aguas medias altas'),
    (50, 'aguas medias'),
    (75, 'aguas medias'),
    (95, 'aguas medias bajas'),
    (100, 'aguas bajas')
 ), status_colors(key, value) AS (
  VALUES 
    (5, '#6fa8dc'),
    (25, '#cfe2f3'),
    (50, '#fff2cc'),
    (75, '#fff2cc'),
    (95, '#f6b26b'),
    (100, '#ea9999')
 )
  SELECT 
    d.unid,
    d.nombre,
    coalesce(rio_mapping.value, d.rio) AS rio,
    round(d.valor::numeric, 2) AS valor,
    d.tendencia,
    coalesce(status_colors.value, '#ffffff') AS status_color,
    d.series_id,
    concat('https://alerta.ina.gob.ar/a5/secciones?seriesId=',d.series_id) AS secciones_url,
    st_x(d.geom) AS x,
    st_y(d.geom) AS y,
    coalesce(status_categories.value, '') AS status_text,
    d.percentil,
    d.fecha AS fecha,
    to_char(d.fecha, 'DD/MM/YYYY HH24:MI') AS fecha_format,
    d.geom,
    d.est
  FROM dist d
  LEFT JOIN rio_mapping ON (rio_mapping.key=d.rio)
  LEFT JOIN status_colors ON (status_colors.key=d.percentil)
  LEFT JOIN status_categories ON (status_categories.key=d.percentil)
  WHERE d.percentil IS NOT NULL
 ORDER BY tabla asc, unid asc, percentil desc