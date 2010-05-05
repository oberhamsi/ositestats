# SiteStats
Beginnings of a Site Tracker.

What it currently does well is: track. The statistics are rudimentary and their generation must
be triggered manually.

# Howto
You'll have to change the database directory in config.js. Start the app.

All the pages you want tracked must contain this piece of JavaScript:

Replace <URL TO SITESTATS>.

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

# Statistics
Startup a ringo shell. Import cron.js and run createstats(). You can view
Access stats under ./stats. More to come...
