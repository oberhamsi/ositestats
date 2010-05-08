# SiteStats
A simple site tracker.

The generated report is simple: you get a dashboard with sparklines for all sites and montly views. Monthly views displays tables & diagrams for:

 * Page Impressions and Unique Clients per day
 * Top 10 Pages, Referrers and User Agent / Browsers per month

# Install Tracking Server
We need RingoJs and its berkeleystore module. Once we have RingoJs additional modules can be installed with its `ringo-admin` command.

    $ cd ~
    $ git clone git://github.com/ringo/ringojs.git
    $ cd ringojs
    $ ant jar
    $ ./bin/ringo 'ringo/unittest' test/all
    $ ./bin/ringo-admin install hns/berkeleystore

Next we would download the sitestats package. If you have already cloned the ositestats repository, you can simlink it into `./ringojs/packages/`. Or you can download it with `ringo-admin`:

    $ ./bin/ringo-admin install http://bitbucket.org/oberhamsi/ositestats/get/tip.zip

Create a config.js using the config-example.js in `./ringojs/packages/sitestats/app/`. You will have to at least fix the `databasePath` to an existing path we can write to.

Then start the app with:

    $ ./bin/ringo packages/sitestats/app/main.js

Visit http://127.0.0.1:8787 and create a new Site. Once you have the site you can get the Tracking Javascript Code from the Dashboard. You will have to put that Javascript into every page you want tracked.

# Notes
This is alpha. Particularly the report generation (cron.js) is very inefficient
but will greatly and without much effort benefit from improvements in 
RingoJs' berkeley module.

I tested if with a 500MB apache logfile, which takes several minutes and eats
at least 1/2 gig of RAM.. but worked.

RingoJs: find other packages http://ringojs.org/wiki/Packages/
