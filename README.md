ositestats
============

A website tracking and statistics application for RingoJs.org

Install
----------

Install package and dependancies:

   $ rp install ositestats

Create an instance:

    $ ositestats create /var/www/foostats/
    $ nano /var/www/foostats/config.json

Launch it:

    $ ositestats serve /var/www/footstas/


Tracking Code
----------------

Insert this at bottom of html files to trigger a count request for that page:

    // You MUST change the following two variables to match
    // your setup:
    //
    //   * COUNTER_DOMAIN
    //   * SITE_NAME
    //
    <script type="text/javascript">
      (function() {
        var COUNTER_DOMAIN = 'http://stats.example.com';
        var SITE_NAME = 'examplesite';
        var stss = document.createElement('script');
        stss.type = 'text/javascript';
        stss.async = true;
        stss.src = COUNTER_DOMAIN + '/hit/?referer=' + escape(document.referrer) +
             '&site=' + SITE_NAME +
             '&random=' + (new Date()).getTime();
        var s = document.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(stss, s);
      })();
    </script>


About Website Statistics
-------------------------

They can help you answer questions. They can not be read as hard facts like 'number of users visiting my site'.

### Unique

A unique browsing device identified by either a cookie (most of the time) or IP/UserAgent combination. Note that

   * the number of Users to your site is usually about 1/3 to 1/2 of the number of Uniques (this depend on various factors)
   * the numbers for Uniques can not simply be added up to get to higher aggregations (10 uniques each day of the week does not equal 700 uniques that week).

### Page

Content requested by the User; i.e. one request to the counter path as used by the Tracking Code (see JavaScript code below).

### UserAgent, Referrer

The distribution of UserAgents and Referers. While this is straight forward for UserAgents (a Unique always has, per definition, only one UserAgent) this is weirder for Referers: each Unique can only contribute one Referer per aggregation (this is an arbirtary restriction imposed by ositestats for a certain effect, read on) although that unique might really have come from several different sources on different occassions within the distribution's timespan.

JSON API
-----------

Not REST, but you can GET Weird and Very Verbose JSON

#### `/aggregatedata/<SITENAME>/<YYYYMM>/`

daily Aggregates of uniques & hits

         {
             "site": "examplesite",
             "timeKey": "201100",
             "aggregates": [
                 {
                     "site": {
                         "title": "examplesite",
                         "domain": "example.com"
                     },
                     "duration": "day",
                     "day": "20110001",
                     "month": "201100",
                     "uniques": 23,
                     "hits": 66
                 },
                 {
                     "site": {
                         "title": "examplesite",
                         "domain": "example.com"
                     },
                     "duration": "day",
                     "day": "20110002",
                     "month": "201100",
                     "uniques": 12,
                     "hits": 27
                 }
             ]
         }

#### `/aggregatedata/<SITENAME>/<YYYY>/`

same Aggregates as above but per month of given year

#### `/distributiondata/<SITENAME>/<DISTRIBUTION_KEY/<YYYYMM>/`

distribution of <DISTRIBUTION_KEY> values among Page Impressions:
currently supported <DISTRUBITON_KEY>s:

   * referer
   * userAgent
   * page

         {
             "site": "examplesite",
             "timeKey": "201100",
             "distributionKey": "referer",
             "distributions": [
                 {
                     "key": "referer",
                     "duration": "month",
                     "month": "201100",
                     "year": "2011",
                     "distributions": "{\"stackoverflow.com\":4,\"null\":40,\"google.com\":2,\"efreedom.com\":2,\"phoboslab.org\":1,\"ycombinator.com\":3,\"google.com.hk\":1}",
                     "site": {
                         "title": "examplesite",
                         "domain": "example.com"
                     }
                 }
             ]
         }
