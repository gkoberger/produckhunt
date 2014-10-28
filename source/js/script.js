$(function() {

  FastClick.attach(document.body);

  /*
   * Beware! Ahead lies spaghetti code
   */

  if(categorizr.isMobile) {
    var id = window.location.pathname.replace(/[^a-zA-Z0-9]/g,'');
    if(!id) {
      id = prompt("Enter the ID from produckhunt.co:").toUpperCase();
    }

    if(id) {
      var myFirebaseRef = new Firebase("https://torid-torch-1955.firebaseio.com/" + id);

      var realtime = {
        alpha: 0,
        beta: 0,
        shots: 0,
      };

      $('body').addClass('mobile ready');
      gyro.frequency = 50;
      gyro.startTracking(function(o) {
        realtime.alpha = o.rawAlpha;
        realtime.beta = o.rawBeta;
        myFirebaseRef.child('realtime').set(realtime);
      });

      var points = {connected: true, testshots: 0};

      var i = 0;
      $(window).resize(function() {
        $('#trigger').width($(window).width());
        $('#trigger').height($(window).height());
      }).trigger('resize');
      $('#trigger').on('click', function(e) {
        e.preventDefault();
        realtime.shots++;
        myFirebaseRef.child('realtime').set(realtime);
        $('body').addClass('flash');
        setTimeout(function() {
          $('body').removeClass('flash');
        }, 100);
      });

    }
  } else {
    $(window).keypress(function(e) {
      if(e.keyCode == 42) {
        window.location.reload();
      }
    });

    $('#start').click(function(e) {
      e.preventDefault();
      pg(2);
    });

    // Use 7
    var id = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5).toUpperCase();
    var myFirebaseRef = new Firebase("https://torid-torch-1955.firebaseio.com/" + id);
    $('.id').text(id);

    gyro.stopTracking();

    $('#phone-input').focus();
    $('#phone-input').keyup(function() {
      if($(this).val().length == 14) {
        $.get('http://phsms.herokuapp.com/message', {number: $(this).val().replace(/[^0-9]/g, ''), url: id})
        pg(2);
      }
    });
    $('#phone-input').formatter({
      'pattern': '({{999}}) {{999}}-{{9999}}',
    });

    var events = {
      move: {},
      shot: {},
    };

    setTimeout(function() {
              //pg(3);
    }, 100);

    var current_pg;
    function pg(i) {
      current_pg = 'pg' + i;
      $('.pg1, .pg2, .pg3, .pg4, .pg5, .pg6').hide();
      $('.pg' + i).show();

      var event = pages[current_pg]();
      if(event.move) {
        events.move[current_pg] = event.move;
      }
      if(event.shot) {
        events.shot[current_pg] = event.shot;
      }
    }

    function getPercent(curr, start, end, actual, t) {
      start = 360 - start
      end = 360 - end
      curr = 360 - curr

      var offset = 360 - start;
      var d = {
        start: 0,
        curr: (offset + curr) % 360,
        end: (offset + end) % 360,
      }

      var m = (d.curr / d.end);
      if(m < 0) m = 0;
      if(m > 1) m = 1;
      return Math.floor(m * actual);// + '%';
    }

    var $d = $('#dot');
    var w_width = $('#box').width();
    var w_height = $('#box').height();
    var current_shots = -1;

    myFirebaseRef.child('realtime').on('value', function (snapshot) {
      var o = snapshot.val();
      if(!o) return;

      if(paused) return;


      if(events['move'][current_pg]) {
        events['move'][current_pg](o);
      }

      if(o.shots > current_shots) {

          current_shots = o.shots;
          if(events['shot'][current_pg]) {
            events['shot'][current_pg](o);
          }

          $('#flash').addClass('on');
          setTimeout(function() {
            $('#flash').removeClass('on');
          }, 100);

      }

    }, function (errorObject) {
      console.log('The read failed: ' + errorObject.code);
    });

    var pointsTypes = ['t', 'r', 'b', 'l'];
    var points = {};
    var paused = false;

    var pages = {

      pg2: function() {
        // Waiting for connection
        return {
          shot: function(){ pg(3); }
        };
      },

      pg3: function() {

        var circle = new ProgressBar.Circle($('.p1')[0], {
          color: 'rgba(0,0,0,0.1)',
          strokeWidth: 3,
          duration: 8000,
        });

        var circle2 = new ProgressBar.Circle($('.p2')[0], {
          color: '#fff',
          strokeWidth: 3,
          duration: 3000,
        });

        circle.animate(1, function() {
          $('.hand').hide();
          $('.stop').addClass('on');
          $('.pg3 h2').text('Stop shooting!');
          $('.pg3 h3').text("Next, we're now going to calibrate the gun");
          circle2.animate(1, function() {
            pg(4);
          })
        })
      },

      pg4: function() {
        var step = 'c';
        var x = Math.floor(w_width / 2)
        var y = Math.floor(w_height / 2)
        $('.target').css({
          left: x,
          top: y,
        });

        return {
          shot: function(o) {
            points[step] = o;

            var next = pointsTypes[0];
            var x, y;
            if(next == 'c') {
              x = Math.floor(w_width / 2)
              y = Math.floor(w_height / 2)
            } else if(next == 't') {
              x = Math.floor(w_width / 2)
              y = 50
            } else if(next == 'r') {
              x = w_width - 50
              y = Math.floor(w_height / 2)
            } else if(next == 'b') {
              x = Math.floor(w_width / 2)
              y = w_height - 50
            } else if(next == 'l') {
              x = 50
              y = Math.floor(w_height / 2)
            }
            // TODO: different browsers (also down below)
            $('.target').addClass('off');
            setTimeout(function() {
              $('.target').css({
                left: x,
                top: y,
              });//'transform', 'translateX('+x+'px) translateY('+y+'px)')
              $('.target').removeClass('off');
            }, 320);

            step = false;
            $('#current').text(step);

            if(pointsTypes.length) {
              paused = true;
              setTimeout(function() {
                paused = false;
                step = pointsTypes.shift();
              }, 300);
            } else {
              pg(5);
            }
          }
        };
      },

      pg5: function() {
        var game = {
          score: 0,
          current: 0,
          paused: true,
          ph_i: 0,
        };

        var level = {
          current: 0,
          shots: 3,
          birdsAmt: 1,
          birds: [],
          birdsPrev: [],
          birdsStatus: [],
        };

        function gameOver() {
          $('#dogLaugh').addClass('on');
          $('#gameOver').show();
        }

        function nextLevel() {
          $('#dog').addClass('on');
          paused = true;
          setTimeout(function() {
            paused = false;
            $('#dog').removeClass('on');
            game.current++;
            level.birdsAmt = Math.min(Math.floor(game.current / 3) + 2, 3);
            level.birds = [];
            level.birdsPrev = [];
            level.birdsStatus = [];
            level.current = 0;
            nextRound();
            sync();
          }, 2000);
        }

        function nextRound(firstTime) {
          game.paused = true;

          // Clear last round's birds
          _.each(level.birds, function(bird) {
            if(bird.hit === 0) {
              bird.hit = -1;
              bird.$el.addClass('fly')
              level.birdsStatus[bird.i] = 'missed';
            }

            level.birdsPrev.push(bird);
          });
          level.birds = [];

          setTimeout(function() {
            $('.bird-parent').removeClass('hit active fly');
            $('.bird-parent').addClass('reset');
          }, firstTime ? 0 : 700);

          setTimeout(function() {
            $('.bird-parent').removeClass('reset');

            if(level.birdsPrev.length === 6) {
              var hits = 0;
              for(var i =0; i < 6; i++) {
                if(level.birdsPrev[i].hit > 0) {
                  hits++;
                }
              }
              if(hits <= 3) {
                return gameOver();
              }
              return nextLevel();
            }

            // Reset the level
            level.shots = 3;

            var possibleBirds = [0, 1, 2];
            shuffle(possibleBirds);

            for(var i = 0; i < level.birdsAmt; i++) {
              var $el = $('.bird-parent' + possibleBirds[i]);
              level.birdsStatus.push('current');
              $el.addClass('active');
              level.birds.push({
                $el: $el,
                hit: 0,
                i: level.birdsStatus.length - 1,
                ph: ph[game.ph_i],
              });

              $('h3', $el).text(ph[game.ph_i][0]);
              $('p', $el).text(ph[game.ph_i][2]);

              game.ph_i++;
            }

            sync();
            game.paused = false;

          }, firstTime ? 100 : 1200);

        }

        nextRound(true);


        function sync() {
          $('#current-level').text(game.current + 1);
          //$('#current-round').text(level.birdsPrev.length / level.birdsAmt);

          // Shots
          $('#stats-votes').removeClass('shots-0 shots-1 shots-2 shots-3').addClass('shots-' + level.shots);

          // Game Scopre
          $('#score').text(("000000" + game.score).substr(-6));

          // Birds
          var $hits = $('.stat-hit').removeClass('status-missed status-hit status-current');
          _.each(level.birdsStatus, function(birdStatus, i) {
            $hits.eq(i).attr('class', 'stat-hit status-' + birdStatus);
          });

        }
        sync();

        var l, t;
        return {
          'move': function(o) {
            l = getPercent(o.alpha, points.l.alpha, points.r.alpha, w_width);
            t = getPercent(o.beta, points.t.beta, points.b.beta, w_height);
            $d.css('transform', 'translateX('+l+'px) translateY('+t+'px)');
          },
          'shot': function(o) {
            if(game.paused) return;

            level.shots--;

            var allShot = true;
            var alreadyHit = false;
            _.each(level.birds, function(bird) {
              if(bird.hit != 0) return;
              if(alreadyHit) {
                allShot = false;
                return;
              }

              var box = $('.bird', bird.$el)[0].getBoundingClientRect();
              if(l > box.left && l < box.right && t > box.top && t < box.bottom) {
                // hit
                alreadyHit = true;
                bird.hit = 1;
                level.birdsStatus[bird.i] = 'hit';
                game.score += bird.ph[1];
                bird.$el.addClass('hit');
                $('#showscore').text("+ " + bird.ph[1] + "pts").css({'left': box.left, 'top': box.top}).addClass('on');
                setTimeout(function() {
                  $('#showscore').removeClass('on');
                }, 100);
              } else {
                allShot = false;
              }
            });

            if(level.shots === 0 || allShot) {
              nextRound();
            }

            sync();
          },
        }
      },

    };

    /*
    myFirebaseRef.child('setup').on('value', function (snapshot) {

      setup = snapshot.val();

      if(pages[current_pg]) {
        pages[current_pg](setup);
      }

    }, function (errorObject) {
      console.log('The read failed: ' + errorObject.code);
    });
    */

    $(window).resize(function() {
      w_width = Math.max($(window).width(), 1144);
      w_height = $(window).height();
      $('#css').text([
        '.full { width: '+(w_width)+'px; height: '+(w_height)+'px; }',
        '#setup .pg5 .bird-parent.active { transform: translateY('+Math.floor(w_height * -0.7)+'px); }',
        '#setup .pg5 .bird-parent.fly { transform: translateY(-'+Math.floor(w_height + 120)+'px); }',
      ].join(''));
    }).trigger('resize')
  }
});

// If you're seeing this, that means I haven't gotten to the API yet :)
var ph = [
  [
    "Ikea Bekant Standing Desk",
    321,
    "New motorized standing desk from Ikea"
  ],
  [
    "All The Free Stock ",
    289,
    "All the Free Stock Images, Videos and Icons in one location"
  ],
  [
    "Morning Reader",
    254,
    "A simple way to read the news and find interesting stories"
  ],
  [
    "Instapage",
    130,
    "Landing page marketing made simple"
  ],
  [
    "Writefull",
    545,
    "A tiny tool to help you write better"
  ],
  [
    "Researchers.io",
    270,
    "Product Hunt for UX research"
  ],
  [
    "Learn X in Y minutes",
    244,
    "Take a tour of your next favorite programming language"
  ],
  [
    "Charge What You're Worth",
    220,
    "A free 9 day course on charging what you're worth"
  ],
  [
    "Peel",
    189,
    "Super Thin iPhone 6 Cases"
  ],
  [
    "IOS Goodies",
    206,
    "A curated list for IOS goodies"
  ],
  [
    "Cappio",
    126,
    "Stock research that isn't overwhelming"
  ],
  [
    "Cont3nt",
    198,
    "Connecting citizen journalists and media companies"
  ],
  [
    "Coolors",
    874,
    "Super fast color schemes generator for cool designers "
  ],
  [
    "Charlie",
    542,
    "Make a killer impression on anyone you meet with"
  ],
  [
    "Rooms",
    430,
    "Create a room for whatever you're into (by Facebook)"
  ],
  [
    "Buffer for iPad & iOS 8",
    263,
    "Share to all your social media sites no matter where you are"
  ],
  [
    "Pixelmator (iPad)",
    218,
    "Full-featured image editing app for the iPad"
  ],
  [
    "Luxe Valet",
    166,
    "New service in San Francisco that sends valets to you"
  ],
  [
    "TestFlight",
    144,
    "Invite upto 1000 external testers using just their email IDs"
  ],
  [
    "Targeted.io",
    153,
    "Test your email designs across 30+ clients before you send'm"
  ],
  [
    "Mighty Mug",
    141,
    "Stop spilling shit"
  ],
  [
    "Remember When",
    139,
    "Bond with friends over great memories"
  ],
  [
    "5by 3.0",
    178,
    "Hand-pick all the best videos on the internet"
  ],
  [
    "Inbox by Google",
    1240,
    "Next generation inbox"
  ],
  [
    "Spruce",
    629,
    "Simple way to make tweets stand out with stunning images"
  ],
  [
    "Ethanifier",
    404,
    "Build your own \"Ethan\" app in under 5 minutes"
  ],
  [
    "Adaptive Backgrounds",
    425,
    "Extract dominant colours from images"
  ],
  [
    "Fabric",
    318,
    "Mobile developer platform by Twitter"
  ],
  [
    "Rocketship.fm",
    281,
    "Make Your Startup a Rocketship"
  ],
  [
    "Openfolio",
    249,
    "Sharing economy comes to personal investing, on your iPhone"
  ],
  [
    "Andy",
    191,
    "Run Android on your Mac or PC"
  ],
  [
    "Drop by Jawbone",
    139,
    "Your personal DJ for every moment"
  ],
  [
    "Bootsnipp",
    164,
    "Hundreds of hand picked snippets for Bootstrap"
  ],
  [
    "Flows",
    177,
    "Chat Without Internet"
  ],
  [
    "Card.io",
    149,
    "Credit card scanning for mobile apps."
  ],
  [
    "Tattly",
    149,
    "Temporary tattoos for everyone"
  ],
  [
    "Master Body Language",
    135,
    "Body Language for Entrepreneurs Course"
  ],
  [
    "Nativ",
    130,
    " Build and market native mobile apps without having to code."
  ],
  [
    "Hendo Hoverboard",
    801,
    "World's first REAL hoverboard (pre-launch)"
  ],
  [
    "Bowery Desktop",
    403,
    "Set up your development environment in 30 seconds flat."
  ],
  [
    "Hopscotch",
    395,
    "A simple app to visualize where on Earth you haven't been. "
  ],
  [
    "Material Design Icons",
    438,
    "750 Free open-source glyphs by Google"
  ],
  [
    "MailChimp Snap",
    307,
    "Send simple, photo-based email campaigns from your phone."
  ],
  [
    "KISSmetrics Path Report",
    279,
    "The fastest way to actionable user insights"
  ],
  [
    "Pixel Perfect Handbook",
    256,
    "A comprehensive handbook on digital design"
  ],
  [
    "A Song a Day",
    219,
    "For those \"too busy\" to discover new music."
  ],
  [
    "LapLock",
    181,
    "Leave your macbook unattended, worry free"
  ],
  [
    "Continuity Keypad",
    176,
    "Dial numbers on your desktop"
  ],
  [
    "Stylify Me",
    140,
    "Helps designers gain an overview of a site's style guide"
  ],
  [
    "Sheetsee.js",
    125,
    "Connect Google Spreadsheets and visualizing the data "
  ],
  [
    "Ampy",
    146,
    "Power your devices from your motion (pre-launch)"
  ],
  [
    "Darma",
    142,
    "Quantified-self for your ass and posture (pre-order)"
  ],
  [
    "Petit Hacks",
    607,
    "Acquisition, retention, & revenue hacks used by companies"
  ],
  [
    "Mattermark",
    435,
    "Ranking 800,000+ high growth Internet companies"
  ],
  [
    "Bluesmart",
    280,
    "World's first smart, connected carry-on luggage (pre-launch)"
  ],
  [
    "Reqres",
    169,
    " A hosted REST-API for testing your front-end against"
  ],
  [
    "Chartblocks",
    163,
    "Import your data, design your chart and start sharing it. "
  ],
  [
    "HiNative",
    252,
    "Language questions answered by native speakers"
  ],
  [
    "Hooks",
    127,
    "All your alerts in one mobile app (iOS)"
  ],
  [
    "Meshfire",
    145,
    "Manage Your Twitter Community with AI Superpowers"
  ],
  [
    "AppGif",
    289,
    "Turn your app previews into gifs"
  ],
  [
    "Metalsmith",
    135,
    "An extremely simple, pluggable static site generator."
  ],
  [
    "Get Notified",
    432,
    "Get Notified when something happens"
  ],
  [
    "Freebbble",
    331,
    "1000+ high-quality design freebies made by Dribbble users."
  ],
  [
    "Beefree",
    307,
    "Free Email editor to build responsive design messages"
  ],
  [
    "FontPark",
    208,
    "The web's largest archive of free fonts"
  ],
  [
    "Brutal Honesty",
    170,
    "Your friends are lying. Get an honest opinion for $10."
  ],
  [
    "ScrollMagic",
    154,
    "The jQuery plugin for magical scroll interactions."
  ],
  [
    "Stock Up",
    700,
    "The best free stock photos in one place"
  ],
  [
    "Codekit ",
    319,
    "Steroids for web developers - build web applications fast."
  ],
  [
    "Tumblr for Mac",
    181,
    "Official Tumblr Mac App"
  ],
  [
    "Apptuse",
    198,
    "Instantly create a mobile app for your e-commerce website"
  ],
  [
    "Airmail 2.0",
    166,
    "Designed for Yosemite with lightning fast performance"
  ],
  [
    "scrollReveal.js",
    178,
    "Declarative on-scroll reveal animations"
  ],
  [
    "AppStop",
    497,
    "Turn your App Store listing into a landing page"
  ],
  [
    "iMac Retina",
    299,
    "iMac with Retina display"
  ],
  [
    "Facebook Safety Check",
    253,
    "Connect with friends and loved ones during a disaster"
  ],
  [
    "Emoji Masks",
    244,
    "Emojis for your face"
  ],
  [
    "Pre-Orders by Tilt",
    223,
    "Add simple, powerful pre-orders to any site"
  ],
  [
    "iPad Air 2",
    147,
    "Thinnest iPad yet"
  ],
  [
    "reSRC",
    169,
    " Free programming learning resources incl. 500 free books"
  ],
  [
    "Mind My Business",
    163,
    "Saving brick and mortars money - powered by open data"
  ],
  [
    "Blue Bottle Travel Kit",
    140,
    "Everything you need to brew. Just add water."
  ],
  [
    "journi 3.0",
    121,
    "Easily create a journal, even together with friends"
  ],
  [
    "Bond",
    624,
    "A simple app that reminds you to keep in touch with people"
  ],
  [
    "Lukewarm Emailer",
    314,
    "Build a list of people on Twitter, reach out w/ a cold email"
  ],
  [
    "Transform Ideas Book",
    302,
    "Step-by-step guide to go from idea to software product"
  ],
  [
    "Nexus 6",
    249,
    "The new Google Nexus"
  ],
  [
    "iOS 8 GUI PSD (iPhone 6)",
    313,
    "A Photoshop template of GUI elements found in iOS 8."
  ],
  [
    "Meadow",
    231,
    "On-demand medical marijuana delivery"
  ],
  [
    "Orchestrate",
    157,
    "Making databases simple again"
  ],
  [
    "Markhor Shoes",
    173,
    "Beautiful handcrafted leather shoes from Pakistan"
  ],
  [
    "Canva for iPad",
    155,
    "Amazingly simple graphic design. Now on iPad"
  ],
  [
    "Vonvo",
    165,
    "Video Convo. Think Google hangouts meets Kickstarter"
  ],
  [
    "Pixate",
    837,
    "Design native mobile app prototypes without code"
  ],
  [
    "Product Psychology",
    479,
    "This Explains Everything: A Course on User Behavior "
  ],
  [
    "Ulysses III",
    276,
    "A powerful writing tool for Mac"
  ],
  [
    "The How",
    232,
    "Learn From Entrepeneurs"
  ],
  [
    "Morning Person",
    238,
    "Get a wake-up call from a real person (pre-launch)"
  ],
  [
    "Transcense",
    183,
    "Lets You Converse With The Deaf, No Sign Language Necessary"
  ],
  [
    "App Making",
    182,
    "A Step-By-Step Guide To Crafting Successful Apps"
  ],
  [
    "Closing Call",
    166,
    "Hacker News for Sales"
  ],
  [
    "Starry",
    128,
    "Look up startup information in Chrome"
  ],
  [
    "Icons8 App",
    140,
    "Access 5000+ icons from the menu bar & import to PS & Xcode."
  ],
  [
    "Grwo",
    130,
    "Get rewarded for learning!"
  ],
  [
    "Uplette",
    173,
    "Better mobile advertising experiences powered by data"
  ],
  [
    "SPI Brand App (Mobile)",
    128,
    "The smart way to integrate brand channels for fan engagement"
  ],
  [
    "Hive",
    530,
    "First free unlimited cloud service in the world."
  ],
  [
    "Startup Notes",
    449,
    "Most actionable advice from each Startup School speaker"
  ],
  [
    "Divide",
    224,
    "Easy backend for your mobile app"
  ],
  [
    "Anonabox",
    174,
    "Tor hardware router: Anonymize Everything You Do Online"
  ],
  [
    "CSStyle",
    163,
    "Modern approach for crafting beautiful stylesheets. "
  ],
  [
    "Sched",
    141,
    "If Wordpress were built for conferences and festivals"
  ],
  [
    "Wovn",
    140,
    "Localize your website in one line of code."
  ],
  [
    "Bughunt",
    131,
    "Find bugs before your users do"
  ],
  [
    "MoviePanda",
    453,
    "Discover and watch 15000+ movies online for free"
  ],
  [
    "Flowkey",
    263,
    "The easiest way to learn piano"
  ],
  [
    "Devicons",
    263,
    "Iconic font made for developers, code jedis, and designers"
  ],
  [
    "500 Brunches",
    150,
    "Meet like-minded people who share your interests over brunch"
  ],
  [
    "Closed Club",
    512,
    "Browse shut-down start-ups & learn why they closed down"
  ],
  [
    "Rico",
    254,
    "Turn your used smartphone into a smarthome device."
  ],
  [
    "Wordoid",
    235,
    "Most creative way to find a catchy name for your new venture"
  ],
  [
    "Visual Designer Checklist",
    129,
    "Workflow checklist tool for designers working within a team"
  ],
  [
    "Product Grunt",
    454,
    "The worst old products, every day"
  ],
  [
    "Tesla Model S P85D",
    314,
    "Dual Motor Model S and Autopilot"
  ],
  [
    "The Starter Kit",
    256,
    "Curated resources for web developers and visual designers"
  ],
  [
    "Lassoo",
    208,
    "Find routes in a circular loop for you to run or ride."
  ],
  [
    "Goji",
    168,
    "The Keyboard for Fun"
  ],
  [
    "Imgix.js",
    173,
    "Your toolbox for truly responsive images."
  ],
  [
    "Pronto",
    139,
    "Battery pack, re-charges your iPhone in 5 minutes (preorder)"
  ],
  [
    "Hackvard",
    137,
    "The first coding community based on in person study groups"
  ],
  [
    "Ethan",
    665,
    "A messaging app for messaging Ethan"
  ],
  [
    "Minipresso",
    338,
    "Hand-press your own fresh espresso anywhere"
  ],
  [
    "Primer",
    275,
    "No-nonsense, jargon-free marketing lessons (by Google)"
  ],
  [
    "Funnel Optimizer",
    179,
    "No one signs up for your newsletter twice."
  ],
  [
    "Quip 3.0",
    162,
    "Work with people, not files. Now with spreadsheets."
  ],
  [
    "SQL School",
    180,
    "Data analysts training data analysts"
  ],
  [
    "Bloc",
    232,
    "Online coding bootcamp - full stack, iOS, Android courses"
  ],
  [
    "Project GIFV",
    190,
    "Imgur is reimagining the looping GIF video"
  ],
  [
    "Rover",
    135,
    "iBeacon platform and open source SDK"
  ],
  [
    "Sound City Project",
    121,
    "Listen to cities around the globe"
  ],
  [
    "20lines",
    140,
    "Sharable user-gen short stories"
  ],
  [
    "Emojiyo Keyboard",
    275,
    "Super-powered Emoji keyboard for iOS8"
  ],
  [
    "Final",
    1036,
    "Never worry about fraud, breaches, or cancelled credit cards"
  ],
  [
    "Clearbit",
    360,
    "Business Intelligence APIs"
  ],
  [
    "Snowball",
    311,
    "All your messages in one place (on Android)"
  ],
  [
    "Lifta Desk Organizer",
    225,
    "A minimalist desk organizer"
  ],
  [
    "IBM Watson APIs",
    220,
    "Offers a variety of services for building cognitive apps. "
  ],
  [
    "Delighted",
    179,
    "Gather feedback (NPS) from your customers"
  ],
  [
    "LinkTexting",
    156,
    " Create Text-To-Download Forms in Seconds"
  ],
  [
    "Charged newsletter",
    219,
    "Weekly roundup of tech, boiled down into bite sized pieces "
  ],
  [
    "TripRebel",
    193,
    "Book your hotel now & get a refund when the price drops"
  ],
  [
    "Serial Podcast",
    133,
    "From This American Life, follow 1 story over a whole season"
  ],
  [
    "The Grid",
    125,
    "AI websites that design themselves"
  ],
  [
    "Grovemade Desk Collection",
    124,
    "Wooden desk accessories"
  ],
  [
    "Ministry of Supply",
    138,
    "High-performance clothing for men"
  ],
  [
    "Amp",
    195,
    "Your phone never sounded better w/ this attachable \"amp\""
  ],
  [
    "Plastc Card",
    601,
    "All your cards in one device w/ an e-ink touchscreen"
  ],
  [
    "Student Developer Pack",
    418,
    "The best developer tools, free for students, by GitHub"
  ],
  [
    "Hacker News API",
    282,
    "Hacker News now has an API. Awesome. :)"
  ],
  [
    "Adobe Shape CC",
    255,
    "Capture shapes with your iPhone and save them as vectors."
  ],
  [
    "Product People ",
    301,
    "Podcast focused on great products and their makers"
  ],
  [
    "Highfive",
    213,
    "Turn any room into a cloud-based video conferencing room "
  ],
  [
    "Squarespace 7",
    186,
    "The easiest, most powerful Squarespace ever"
  ],
  [
    "Baron Fig Apprentice",
    170,
    "Pocket Notebook inspired by community feedback"
  ],
  [
    "Luzme",
    164,
    "Never pay full-price for an ebook again"
  ],
  [
    "Quietly",
    141,
    "Organize, create, and share lists of everything."
  ],
  [
    "Signul",
    329,
    "The world's first personal beacon system (pre-launch)"
  ],
  [
    "UX Companion",
    305,
    "A handy glossary of UX theories, tools and principles (iOS)"
  ],
  [
    "Font Awesome",
    404,
    "A font of scalable vector icons"
  ],
  [
    "Swipe",
    165,
    "See the photos & videos your friends won't post on Facebook"
  ],
  [
    "Dot Grid Notebooks",
    197,
    "A must have for every designer."
  ],
  [
    "StandStand",
    171,
    "The truly portable standing desk (pre-launch)"
  ],
  [
    "The Pocket Drone",
    141,
    "Your personal flying robot.  It goes wherever you do."
  ],
  [
    "ShipHawk",
    206,
    "Technology for Shipping the Big Stuff"
  ],
  [
    "Roundview",
    191,
    "Your online reading profile"
  ],
  [
    "Thought Plan",
    364,
    "Super convenient tool to write down your thoughts & ideas"
  ],
  [
    "UI Parade",
    194,
    "User interface design tools and design inspiration"
  ],
  [
    "FreePik",
    285,
    "Free graphic resources for designers and developers"
  ],
  [
    "TheCodePlayer",
    158,
    "Timelapse video walkthroughs of cool stuff created with code"
  ],
  [
    "StudySoup",
    132,
    "The #1 P2P College Learning Marketplace"
  ],
  [
    "Flic",
    342,
    "Like Tinder for your camera roll"
  ],
  [
    "GifBook",
    260,
    "Make animated GIFs into paper flip books"
  ],
  [
    "EnjoyCSS",
    187,
    "CSS generator for rich graphical styles without coding"
  ],
  [
    "Email 1K",
    229,
    "Double Your Email List"
  ],
  [
    "Growth Hacker Marketing",
    144,
    "Ryan Holiday's book, re-released and expanded "
  ],
  [
    "ScribbleBoard",
    134,
    "iOS8 Keyboard for hand drawing your messages"
  ],
  [
    "Startup Metrics Dashboard",
    163,
    "Create your own realtime metrics dashboard powered by PubNub"
  ],
  [
    "Evernote Context",
    136,
    "Automatic Research Content in Evernote"
  ],
  [
    "Dash Chassis API",
    158,
    "API for the internet of cars"
  ],
  [
    "Topwick",
    182,
    "Curated Reading and Products for Modern Men"
  ],
  [
    "Xcode for Designers",
    397,
    "Learn how to create native iOS apps in 5 days"
  ],
  [
    "Colourcode",
    345,
    "Find your colour scheme"
  ],
  [
    "SweetAlert",
    482,
    "A beautiful replacement for JavaScript's alert()"
  ],
  [
    "SketchCasts",
    200,
    "A weekly screencast, all about how to use Sketch"
  ],
  [
    "Translator Keyboard",
    143,
    "iOS app translates as you type into one of 44 languages"
  ],
  [
    "Levle",
    186,
    "An easier way to custom frame your posters, prints and photo"
  ],
  [
    "Bootstrap Tour",
    137,
    "Add a tour to your site - it's open source, too ;)"
  ],
  [
    "Content Analytics",
    137,
    "See what content your visitors are actually reading"
  ],
  [
    "Bellabeat",
    253,
    "Keep track & gain insight about your baby's health"
  ],
  [
    "UI8",
    125,
    "Carefully crafted UI design assets"
  ],
  [
    "Wishbone iOS App",
    332,
    " Comparing social content as part of your morning routine. "
  ]
];

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex ;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

shuffle(ph);

