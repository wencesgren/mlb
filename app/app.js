'use strict';

angular.module('myApp', [
  'ngRoute',
  'ngMaterial',
  'md.data.table',
  'LocalStorageModule',
  'myApp.views.home',
])

.config(function ($routeProvider, localStorageServiceProvider, $locationProvider, $mdThemingProvider) {
  $routeProvider.otherwise({redirectTo: '/'});
  $locationProvider.html5Mode(true);
  localStorageServiceProvider.setPrefix('mlb');

  var mlbRedMap = $mdThemingProvider.extendPalette('red', {
    '500': '#cd2026',
    'contrastDefaultColor': 'light'
  });
  var mlbBlueMap = $mdThemingProvider.extendPalette('blue', {
    '500': '#2a2a78',
    'contrastDefaultColor': 'light'
  });

  $mdThemingProvider.definePalette('mlbRed', mlbRedMap);
  $mdThemingProvider.definePalette('mlbBlue', mlbBlueMap);
  $mdThemingProvider.theme('default')
    .primaryPalette('mlbRed')
    .accentPalette('mlbBlue');
})

.controller('SiteCtrl', function($scope, $rootScope, teamService, dateService, $mdSidenav) {
  $scope.teams = teamService.getTeams();
  $scope.date = dateService;
  $scope.myDate = new Date();

  $scope.updateList = function() {
    $rootScope.$broadcast('updateList');
  }
})

.service('teamService',['localStorageService', function(localStorageService) {
  return {
    teams: [],
    getTeams: function() {
      if (localStorageService.get('Teams')) {
        this.teams = localStorageService.get('Teams');

        return this.teams
      } else {
        this.teams = [{
          id: '141',
          name:'Blue Jays',
          logo: '../../img/logos/tor.png'
        }];

        localStorageService.set('Teams', this.teams);

        return this.teams;
      }
    },
    followTeam: function(id, name, logo) {
      var obj = {
        id: id,
        name: name,
        logo: logo
      };

      this.teams.push(obj);
      localStorageService.set('Teams', this.teams);
    },
    unfollowTeam: function(index) {
      this.teams.splice(index, 1);
      localStorageService.set('Teams', this.teams);
    },
    isFollowing: function(id) {
      var following = false;

      angular.forEach(this.teams, function(value, key) {
        if (id == value.id) {
          following = true;
        }
      });

      return following;
    }
  }
}]);
