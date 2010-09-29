CREATE INDEX site_title ON site (title);
CREATE INDEX site_domain ON site (domain);
CREATE INDEX site_id ON site (id);
/*
 very important for fast aggregation
*/
CREATE INDEX hit_site_month ON hit (site, month);
CREATE INDEX hit_site_day ON hit (site, day);

