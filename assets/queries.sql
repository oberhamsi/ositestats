// those are not in use by ositestats but usefull to explore the data or to do sanity checks

// hits and uniques per site for a month
select site.id, count(*), count(distinct(hit.unique)) from hit, site where site.id = hit.site and hit.month = '201101' group by site.id;

select count(*), count(distinct(hit.unique)) from hit where site.id = 2 and hit.month = '201101';

// age of uniques
select hit.unique, min(hit.month), max(hit.month), count(*) from hit where site=2 group by hit.unique having min(hit.month) != max(hit.month) and max(hit.month) = '201101';

// top referers (we only care about domain but hard to extract)
select lower(hit.referer), count(*) from hit where hit.site = 2 and hit.month = '201101' group by lower(hit.referer) order by count(*) desc limit 40;

// top pages
select lower(hit.page), count(*) from hit where hit.site = 2 and hit.month = '201101' group by lower(hit.page) order by count(*) desc limit 40;

// missing: top user agents. how to normalize?
