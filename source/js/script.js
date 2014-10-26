(function() {
  /*
   * Beware! Ahead lies spaghetti code
   */

  if(categorizr.isMobile) {
    var id = prompt("What's the ID?").toUpperCase();
    var myFirebaseRef = new Firebase("https://torid-torch-1955.firebaseio.com/" + id);

    var realtime = {
      alpha: 0,
      beta: 0,
      shots: 0,
    };

    $('body').addClass('mobile');
    gyro.frequency = 50;
    gyro.startTracking(function(o) {
      realtime.alpha = o.rawAlpha;
      realtime.beta = o.rawBeta;
      myFirebaseRef.child('realtime').set(realtime);
    });

    var points = {connected: true, testshots: 0};

    var i = 0;
    $('#trigger').click(function(e) {
      e.preventDefault();
      realtime.shots++;
      myFirebaseRef.child('realtime').set(realtime);

      /*

      if(points.testshots < 5) {
        points.testshots++;
        points.step = 'c';
        myFirebaseRef.child('setup').set(points);
        return;
      }


      points[pointsTypes[i]] = [o_saved.alpha, o_saved.beta];

      if(i >= pointsTypes.length - 1) {
        points.step = 'go';
      } else {
        points.step = pointsTypes[i+1];
      }

      $('#trigger').text(pointsTypes[i+1]);
      i++;
      myFirebaseRef.child('setup').set(points);
      */
    });
    //myFirebaseRef.child('setup').set(points);

  } else {
    $(window).keypress(function(e) {
      if(e.keyCode == 42) {
        window.location.reload();
      }
      if(e.keyCode == 47) {
        window.location.hash = 'gk';
        window.location.reload();
      }
    });

    if(window.location.hash == '#gk') {
      setTimeout(function() {
        window.location.hash = '';
        pg(2);
      }, 100);
    }

    // Use 7
    var id = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 3).toUpperCase();
    var myFirebaseRef = new Firebase("https://torid-torch-1955.firebaseio.com/" + id);
    $('.id').text(id);

    gyro.stopTracking();

    $('#phone-input').focus();
    $('#phone-input').keyup(function() {
      if($(this).val().length == 14) {
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

    /*
    setTimeout(function() {
              pg(5);
    }, 100);
    */

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

      if(events['move'][current_pg]) {
        events['move'][current_pg](o);
      }

      if(o.shots > current_shots && events['shot'][current_pg]) {
        events['shot'][current_pg](o);
        current_shots = o.shots;
      }

    }, function (errorObject) {
      console.log('The read failed: ' + errorObject.code);
    });

    var pointsTypes = ['c', 't', 'r', 'b', 'l'];
    var points = {};

    var pages = {

      pg2: function() {
        // Waiting for connection
        return {
          shot: function(){ pg(3); }
        };
      },

      pg3: function() {
        var shotsLeft = 5;
        return {
          shot: function() {
            shotsLeft--;
            $('.testshots').text(shotsLeft);
            if(shotsLeft <= 0) {
              pg(4);
            }
          }
        };
      },

      pg4: function() {
        var step = 'c';
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
            $('.target').css('transform', 'translateX('+x+'px) translateY('+y+'px)')

            step = false;
            $('#current').text(step);

            if(pointsTypes.length) {
              setTimeout(function() {
                step = pointsTypes.shift();
                $('#current').text(step);
              }, 300);
            } else {
              pg(5);
            }
          }
        }
      },

      pg5: function() {
        var game = {
          score: 0,
          current: 0,
          paused: true,
        };

        var level = {
          current: 0,
          shots: 3,
          birdsAmt: 2,
          birds: [],
          birdsPrev: [],
          birdsStatus: [],
        };

        function nextLevel() {
          game.current++;
          level.birdsAmt = Math.min(Math.floor(game.current / 3) + 1, 3);
          level.birds = [];
          level.birdsPrev = [];
          level.birdsStatus = [];
          level.current = 0;
          sync();
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
            $('.bird').removeClass('hit active fly');
            $('.bird').addClass('reset');
          }, firstTime ? 0 : 700);

          setTimeout(function() {
            $('.bird').removeClass('reset');

            if(level.birdsPrev.length === 6) {
              nextLevel();
            }

            // Reset the level
            level.shots = 3;

            for(var i = 0; i < level.birdsAmt; i++) {
              var $el = $('.bird' + i);
              level.birdsStatus.push('current');
              $el.addClass('active');
              level.birds.push({
                $el: $el,
                hit: 0,
                i: level.birdsStatus.length - 1,
              });
            }

            sync();
            game.paused = false;

          }, firstTime ? 100 : 1200);

        }

        nextRound(true);


        function sync() {
          $('#current-level').text(game.current);
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
            $d.css('transform', 'translateX('+(l)+'px) translateY('+t+'px)');
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

              var box = bird.$el[0].getBoundingClientRect();
              if(l > box.left && l < box.right && t > box.top && t < box.bottom) {
                // hit
                alreadyHit = true;
                bird.hit = 1;
                level.birdsStatus[bird.i] = 'hit';
                game.score += 15;
                bird.$el.addClass('hit');
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
        '#setup .pg5 .bird.active { transform: translateY('+Math.floor(w_height * -0.7)+'px); }',
        '#setup .pg5 .bird.fly { transform: translateY(-'+Math.floor(w_height + 120)+'px); }',
      ].join(''));
    }).trigger('resize')
  }
})();
