# SiteStats
Beginnings of a Site Tracker.

What it does well already is track. The generated report is rudimentary and
only has a month view which displays tables & diagrams for:

 * Page Impressions and Unique Clients per day
 * Top 10 Pages, Referrers and User Agent / Browsers per month

# How To

 * install hns/berkeleystore
 * change the database directory in config.js

All the pages you want tracked must contain this piece of JavaScript. You
must change <URL TO SITESTATS> to the url where sitestats app is running

    <script type="text/javascript">
      (function() {
        var stss = document.createElement('script');
        stss.type = 'text/javascript';
        stss.async = true;
        stss.src = 'http://<URL TO SITESTATS>/?referer' + escape(document.referrer) +
             '&random=' + (new Date()).getTime();
        var s = document.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(stss, s);
      })();
    </script>

# Notes
This is alpha. Particularly the report generation (cron.js) is very inefficient
but will greatly and without much effort benefit from improvements in 
ringojs' berkeley module.

I tested if with a 500MB apache logfile, which takes several minutes and eats
at least 1/2 gig of RAM.. but worked.
