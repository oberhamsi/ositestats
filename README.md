ositestats
============

A website tracking server for RingoJs.

Install
----------

Install RingoJs

    git clone git://github.com/ringo/ringojs.git
    cd ringojs
    ant jar

for more details on RingoJs installation see <http://ringojs.org/getting_started>

Install ringo-sqlstore and stick

    ringo-admin install grob/ringo-sqlstore
    ringo-admin install ringo/stick

Create 'config.js` using `config-example.js` as a template:

    cp config-example.js config.js
    nano config.js


Optional: Clickgraph
---------------------
The clickgraph shows the most often used paths through your website

Install graphviz

    aptitude install graphviz

specifically `/usr/bin/dot` must be present

RingoJs will create directories and files below `static/clickgraphs/`:

    mkdir static/clickgraphs
    // chmod & chown as necessary

Usage
----------

Start with

    ringo main.js

The app gives you a dashboard to create new sites that need tracking:

  * Site name - keep to lowercase, alphanums for now `examplesite`
  * Domain - comma seperated list of TLDs that belong to that site `example.com, a.example.com, b.example.com, example.org`

The list of domains is essential! Count requests must originate from that domain or they are not counted.

Tracking Code
----------------

Insert this at bottom of html files to trigger a count request for that page:

    // Adapt:
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

If a User has JavaScript disabled then he won't be counted. That is intentional - he probably does not want to be counted. Why else would anyone disable JavaScript.

OSiteStats tracks to basic values that are aggregate for day and month timespans:

   * Unique: A unique browsing device identified by either a cookie (most of the time) or IP/UserAgent combination.
   * Page: Content requested by the User



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

#### `/static/clickgraphs/<SITENAME>/<YYYYMM>.png`

ClickGraph png for requested month
