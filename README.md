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

Add a site to track to your instance:

    $ ositestats addiste /var/www/foostats/ example-site example.com

If your site is reachable under multiple domains, you can seperate them with ",". E.g.:

    $ ositestats addiste /var/www/foostats/ example-site example.com,foo.example.com,example.org

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

The distribution of UserAgents and Referers.

A Unique can come from several sources within the aggregation timespan but ositestats only counts the first Referer for each Unique. So the Referrer count gives you a top list of domains by which a Unique was *first* refered to you within the given timespan.
