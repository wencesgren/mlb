'use strict';

angular.module('myApp.views.home', ['ngRoute'])

.config(function ($routeProvider, $mdDateLocaleProvider, $mdIconProvider) {
  $routeProvider.when('/', {
    templateUrl: 'views/home/home.html',
    controller: 'HomeCtrl'
  });
  $mdDateLocaleProvider.formatDate = function(date) {
    return moment(date).format('YYYY-MM-DD');
  };
  $mdIconProvider.fontSet('md', 'material-icons');
})

.controller('HomeCtrl', function($scope, gameFactory, $mdDialog, $mdMedia) {
  $scope.pageClass = 'page-home';
  $scope.games = [];
  $scope.empty = true;

  $scope.updateList = function () {
    gameFactory.updateGames().success(function(payload) {
      var game = payload.data.games.game;
      $scope.empty = false;

      if (!angular.isUndefined(game)) {
        if (angular.isArray(game)) {
          $scope.games = [];
          angular.forEach(game, function(value, key) {
            var new_game = gameFactory.createGame(value);
            $scope.games.push(new_game);
          });
        } else if (angular.isObject(game)) {
          $scope.games = [];
          var new_game = gameFactory.createGame(game);
          $scope.games.push(new_game);
        }
      } else {
        $scope.games = [];
        $scope.empty = true;
      }
    });
  }

  $scope.updateList();

  $scope.$on('updateList', function(event, args) {
    $scope.updateList();
  });

  $scope.showDetail = function(ev, game) {

    $mdDialog.show({
      controller: DetailDialogController,
      templateUrl: 'views/home/detail.tmpl.html',
      parent: angular.element(document.body),
      targetEvent: ev,
      clickOutsideToClose: true,
      fullscreen: true,
      locals: {
        game: game
      },
    })
    .then(function(answer) {

    }, function() {
      $scope.updateList();
    });
  };

  $scope.showTeams = function(ev) {

    $mdDialog.show({
      controller: TeamsController,
      templateUrl: 'views/home/teams.tmpl.html',
      parent: angular.element(document.body),
      targetEvent: ev,
      clickOutsideToClose: true,
      fullscreen: true,
    })
    .then(function(answer) {

    }, function() {
      $scope.updateList();
    });
  };


  /**
   * Helper function to return dynamic class list for each game.
   *
   * @param Object
   *   Single game object.
   *
   * @return Array
   *  List of row classes for current game row
   */
  $scope.rowClass = function(game){
    return game.classes;
  };

  function DetailDialogController($scope, $mdDialog, game, boxScoreQuery, teamService) {
    $scope.game = game;
    $scope.promise = boxScoreQuery;
    $scope.boxscore = null;

    $scope.getBoxScore = function () {
      if ($scope.game.scored) {
        boxScoreQuery($scope.game.game_data_directory).success(function(payload) {
          $scope.boxscore = payload.data.boxscore;
        });
      }
    };

    $scope.follow = function(team, side) {
      if (!teamService.isFollowing(team.id)) {
        teamService.followTeam(team.id, team.name, team.logo);
        game[side].is_favourite = true
      }
    }

    $scope.getBoxScore();

    /**
     * Helper function to return dynamic class list for each game.
     *
     * @param Object
     *   Single game object.
     *
     * @return Array
     *  List of row classes for current game row
     */
    $scope.rowClass = function(game){
      return game.classes;
    };

    $scope.cancel = function() {
      $mdDialog.cancel();
    };
  }

  function TeamsController($scope, $mdDialog, teamService) {
    $scope.teams = teamService.getTeams();

    $scope.remove = function(index) {
      teamService.unfollowTeam(index);
    };

    $scope.cancel = function() {
      $mdDialog.cancel();
    };
  }
})

.service('dateService',function() {
  return {
    _date: moment().format('YYYY-MM-DD'),
    get: function() {
      return this._date;
    },
    set: function(date) {
      this._date = moment(date).format('YYYY-MM-DD');
    },
    next: function() {
      this._date = moment(this.get()).add(1, 'days').format('YYYY-MM-DD');
    },
    previous: function() {
      this._date = moment(this.get()).subtract(1, 'days').format('YYYY-MM-DD');
    },
    format: function(date) {
      return moment(date).format('LL');
    }
  }
})

.factory('gameFactory',function(teamService, dateService, ListQuery, NO_SCORE) {
  return {
    /**
     * Create a new game from query response.
     *
     * @param Object
     *   An object returned from the ListQuery.
     *
     * @return Object
     *  A single game object
     *
     * @see updateGames()
     */
    createGame: function(data) {
      var obj = {
        title: data.away_name_abbrev + ' @ ' + data.home_name_abbrev,
        stadium: data.venue + ', ' + data.location,
        time: data.home_time + ' ' + data.ampm + ' ' + data.home_time_zone,
        status: data.status.status,
        is_sticky: false,
        game_data_directory: data.game_data_directory,
        scored: false,
        classes: [],
        homeTeam: {
          id: data.home_team_id,
          name: data.home_team_name,
          name_abbrev: data.home_name_abbrev,
          logo: this.getLogoPath(data.home_name_abbrev.toLowerCase()),
          is_favourite: false,
          runs: (NO_SCORE.indexOf(data.status.status) == '-1') ? data.linescore.r.home : '',
          winner: false,
          stats: data.home_win + ' - ' + data.home_loss,
        },
        awayTeam: {
          id: data.away_team_id,
          name: data.away_team_name,
          name_abbrev: data.away_name_abbrev,
          logo: this.getLogoPath(data.away_name_abbrev.toLowerCase()),
          is_favourite: false,
          runs: (NO_SCORE.indexOf(data.status.status) == '-1') ? data.linescore.r.away : '',
          winner: false,
          stats: data.away_win + ' - ' + data.away_loss,
        }
      };

      if (teamService.isFollowing(obj.homeTeam.id)) {
        obj.homeTeam.is_favourite = true;
      } else if (teamService.isFollowing(obj.awayTeam.id)) {
        obj.awayTeam.is_favourite = true;
      }

      if ( obj.homeTeam.is_favourite || obj.awayTeam.is_favourite ) {
        obj.is_sticky = true;
      }

      if (NO_SCORE.indexOf(obj.status) == '-1') {
        var draw = (data.linescore.r.diff == '0');
        obj.scored = true;

        if (obj.status == 'Final' && !draw) {
          if (obj.homeTeam.runs > obj.awayTeam.runs) {
            obj.homeTeam.winner = true;
            obj.classes.push('home-win');
          } else if (obj.awayTeam.runs > obj.homeTeam.runs) {
            obj.awayTeam.winner = true;
            obj.classes.push('away-win');
          }
        } else if (obj.status == 'In Progress') {
          obj.classes.push('in-progress');
        }
      } else {
        if (obj.status == 'Postponed') {
          obj.homeTeam.runs = '0';
          obj.awayTeam.runs = '0';
          obj.scored = true;
        } else {
          obj.scored = false;
          obj.classes.push('no-score');
        }
      }

      return obj;
    },
    /**
     * Query current date.
     */
    updateGames: function() {
      return ListQuery(dateService.get());
    },
    /**
     * Helper function to return relative path to team's logo.
     *
     * @param String
     *   Team name abbreviation.
     *
     * @return String
     *  Logo path
     */
    getLogoPath: function(abbrev) {
      return '../../img/logos/' + abbrev + '.png';
    },
  }
})

.constant('NO_SCORE', [
  'Preview',
  'Pre-Game',
  'Warmup',
  'Cancelled',
  'Postponed'
])

.directive('fixture', function($compile) {
  return {
    restrict: 'E',
    scope: false,
    template: '<a href="#" ng-click="showDetail($event, game)" flex layout="row" layout-wrap>' +
        '<div class="teams" flex="80">' +
          '<div class="team team-away" layout="row" layout-wrap>' +
            '<div class="team-info" flex="90" layout="row" layout-wrap>' +
              '<div class="team-info__logo" style="background-image: url(\'{{ game.awayTeam.logo }}\')" flex="10"></div>' +
              '<p class="team-info__name" flex="90">{{ game.awayTeam.name }}</p>' +
            '</div>' +

            '<div class="team-score" flex="10">' +
              '<p ng-if="game.scored === true">' +
                '{{ game.awayTeam.runs }}' +
              '</p>' +
              '<p ng-if="game.scored === false">' +
                '{{ game.awayTeam.stats }}' +
              '</p>' +
            '</div>' +
          '</div>' +
          '<div class="team team-home" layout="row" layout-wrap>' +
            '<div class="team-info" flex="90" layout="row" layout-wrap>' +
              '<div class="team-info__logo" style="background-image: url(\'{{ game.homeTeam.logo }}\')" flex="10"></div>' +
              '<p class="team-info__name" flex="90">{{ game.homeTeam.name }}</p>' +
            '</div>' +

            '<div class="team-score" flex="10">' +
              '<p ng-if="game.scored === true">' +
                '{{ game.homeTeam.runs }}' +
              '</p>' +
              '<p ng-if="game.scored === false">' +
                '{{ game.homeTeam.stats }}' +
              '</p>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="status" flex="20">' +
          '<p>{{ game.status }}</p>' +
          '<p ng-if="game.scored === false">' +
            '{{ game.time }}' +
          '</p>' +
        '</div>' +
      '</a>',
    link: function(scope, element, attrs) {
       scope.insert = function() {
         var container = angular.element('<div ng-include="\'tempTest.html\'"></div>');
         element.before($compile(container)(scope));
       }
    }
  }
})

.factory('boxScoreQuery', function($http) {
  return function(game_data_directory) {

    return $http({
      method: 'GET',
      url: 'http://gd2.mlb.com' + game_data_directory + '/boxscore.json'
    });
  }
})

.factory('ListQuery', function($http) {
  return function(date) {
    var split = date.split('-');
    var year  = split[0];
    var month = split[1];
    var day   = split[2];

    return $http({
      method: 'GET',
      url: 'http://gd2.mlb.com/components/game/mlb/year_' + year + '/month_' + month + '/day_' + day + '/master_scoreboard.json'
    });
  }
});
