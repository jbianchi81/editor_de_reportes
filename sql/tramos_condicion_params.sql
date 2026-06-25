WITH alturas_last AS (
         SELECT series.estacion_id AS unid,
            observaciones.timestart,
            series.id AS series_id,
            series.var_id,
            var.nombre as var_nombre,
            valores_num.valor
           FROM redes 
           JOIN estaciones on estaciones.tabla = redes.tabla_id
           JOIN series on series.estacion_id = estaciones.unid
           JOIN var on series.var_id = var.id
           JOIN observaciones on observaciones.series_id = series.id
           JOIN valores_num on valores_num.obs_id = observaciones.id
           JOIN tramos on tramos.unid = estaciones.unid
          WHERE series.var_id = 2 AND series.proc_id = 1 AND series.unit_id = 11 
          AND observaciones.timestart >= case when '%timestart%'='1800-01-01' 
                                        then current_timestamp-'7 days'::interval
                                        else '%timestart%'::timestamp end
	        AND observaciones.timeend <= case when '%timeend%' = '1800-01-01' 
	                                  then current_timestamp
	                                  else '%timeend%'::timestamp end
	        AND redes.id= CASE WHEN %redId%!=0 THEN %redId% ELSE redes.id END 
	        AND estaciones.tipo= CASE WHEN '%tipo%' != 'X' THEN '%tipo%' else estaciones.tipo END
          AND tramos.nombre is not NULL
        ), caudales_last AS (
         SELECT series.estacion_id AS unid,
            observaciones.timestart,
            series.id AS series_id,
            series.var_id,
            var.nombre as var_nombre,
            valores_num.valor
           FROM redes 
           JOIN estaciones on estaciones.tabla = redes.tabla_id
           JOIN series on series.estacion_id = estaciones.unid
           JOIN var on series.var_id = var.id
           JOIN observaciones on observaciones.series_id = series.id
           JOIN valores_num on valores_num.obs_id = observaciones.id
           JOIN tramos on tramos.unid = estaciones.unid
          WHERE series.var_id = 4 AND series.proc_id in (1,2) AND series.unit_id = 10 
            AND observaciones.timestart >= case when '%timestart%'='1800-01-01' 
                                        then current_timestamp-'7 days'::interval
                                        else '%timestart%'::timestamp end
	        AND observaciones.timeend <= case when '%timeend%' = '1800-01-01' 
	                                  then current_timestamp
	                                  else '%timeend%'::timestamp end
	        AND redes.id= CASE WHEN %redId%!=0 THEN %redId% ELSE redes.id END 
	        AND estaciones.tipo= CASE WHEN '%tipo%' != 'X' THEN '%tipo%' else estaciones.tipo END
          AND tramos.nombre is not NULL
        ),
        last as (
          select *  from alturas_last
          union ALL
          select * from caudales_last
        ),
        ult AS (
          SELECT last.unid,
            max(last.timestart) AS date,
            last.series_id,
            last.var_id,
            last.var_nombre,
            array_agg(array[to_char(timestart::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),round(valor::numeric,2)::text] order by timestart) AS timeseries,
            to_char(min(timestart::timestamptz at time zone 'UTC'),'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') timestart,
            to_char(max(timestart::timestamptz at time zone 'UTC'),'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') timeend
           FROM last
          WHERE last.valor IS NOT NULL
          AND last.valor != 'NaN'
          GROUP BY last.unid, last.series_id, last.var_id, last.var_nombre
        ), ult_v AS (
         SELECT ult_1.unid,
            ult_1.series_id,
            ult_1.var_id,
            ult_1.var_nombre,
            ult_1.date,
            last.valor
           FROM ult ult_1
           JOIN last ON ult_1.series_id = last.series_id 
           AND last.timestart = ult_1.date
        ), v AS (
         SELECT ult_v.unid,
            ult_v.series_id,
            ult_v.var_id,
            ult_v.var_nombre,
            ult_v.date,
            ult_v.valor,
            round(avg(last.valor)::numeric, 2) AS valor_precedente
           FROM ult_v
             LEFT JOIN last 
             ON ult_v.series_id = last.series_id
             AND last.timestart <= (ult_v.date - '1 day'::interval) 
             AND last.timestart > (ult_v.date - '2 days'::interval)
          GROUP BY ult_v.unid, ult_v.series_id, ult_v.var_id, ult_v.var_nombre, ult_v.date, ult_v.valor
        ),
        percentiles AS (
            SELECT *
            FROM series_percentiles_ref
            UNION ALL (
                SELECT
                    series_id,
                    100,
                    '-Infinity'::float8
                FROM series_percentiles_ref 
                WHERE percentil=5)
        ),
        percentiles_dict AS (
          SELECT 
              series_percentiles_ref.series_id,
              jsonb_object_agg(series_percentiles_ref.percentil, series_percentiles_ref.valor) AS percentiles
          FROM series_percentiles_ref
          JOIN last ON last.series_id=series_percentiles_ref.series_id
          GROUP BY series_percentiles_ref.series_id
        )
 SELECT DISTINCT ON (estaciones.tabla, v.unid, v.series_id)
    v.unid,
    timezone('ART'::text, v.date) AS fecha,
    v.valor,
    v.valor_precedente,
    CASE
        WHEN round(v.valor::numeric, 2) > round(v.valor_precedente, 2) THEN 'crece'::text
        WHEN round(v.valor::numeric, 2) = round(v.valor_precedente, 2) THEN 'permanece'::text
        ELSE 'baja'::text
    END AS tendencia,
    tramos.nombre,
    estaciones.tabla,
    estaciones.geom,
    tramos.geom as geom_tramo,
    estaciones.cero_ign,
    v.series_id,
    v.var_id,
    v.var_nombre as variable,
    ult.timeseries AS timeseries,
    ult.timestart,
    ult.timeend,
    estaciones.rio,
    percentiles.percentil,
    case 
        when percentiles.percentil > 95 then 'aguas bajas'
        when percentiles.percentil > 75 then 'aguas medias bajas'
        when percentiles.percentil > 25 then 'aguas medias'
        when percentiles.percentil > 5 then 'aguas medias altas'
        when percentiles.percentil >= 0 then 'aguas altas'
        else NULL
    end AS condicion,
    percentiles_dict.percentiles
   FROM v
   JOIN estaciones ON (v.unid = estaciones.unid)
   JOIN ult ON (v.series_id = ult.series_id)
   JOIN tramos ON (tramos.unid=v.unid)
   LEFT JOIN percentiles ON (percentiles.series_id=ult.series_id AND v.valor >= percentiles.valor)
   LEFT JOIN percentiles_dict ON percentiles_dict.series_id = v.series_id
  ORDER BY estaciones.tabla asc, v.unid asc, v.series_id asc, percentiles.valor desc
