# SiteStats
A simple site tracker.

The generated report is simple: you get a dashboard with sparklines for all sites and montly views. monthly views displays tables & diagrams for:

 * Page Impressions and Unique Clients per day
 * Top 10 Pages, Referrers and User Agent / Browsers per month

# Install Tracking Server
We need RingoJs and its berkeleystore module.

    $ cd ~
    $ git clone git://github.com/ringo/ringojs.git
    $ cd ringojs
    $ ant jar
    $ ./bin/ringo 'ringo/unittest' test/all
    $ ./bin/ringo-admin install hns/berkeleystore
    $ ./bin/ringo-admin install bitbucket/oberhamsi/sitestats

Now create a config.js using the config-example.js. Change the database
path and your default site. Then start the app with:

    $ ./bin/ringo packages/sitestats/app/main.js

Visit http://127.0.0.1:8080 and create a new Site. Once you have the site you can get the Tracking Javascript Code from the Dashboard. You will have to put that Javascript into every page you want tracked.

# Notes
This is alpha. Particularly the report generation (cron.js) is very inefficient
but will greatly and without much effort benefit from improvements in 
ringojs' berkeley module.

I tested if with a 500MB apache logfile, which takes several minutes and eats
at least 1/2 gig of RAM.. but worked.
