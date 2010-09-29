CREATE INDEX site_title_domain ON site (title, domain);
/*
 very important for fast aggregation
*/
CREATE INDEX hit_site_month ON hit (site, month);
CREATE INDEX hit_site_day ON hit (site, day);

