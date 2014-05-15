var BigRedButton = BigRedButton || {};

// Run the main function after doing the jQuery ajax setup.
var main = function(B, $) {
  var ip = 'Not Set';
  var setIp = function(data) {
    ip = data.ip;
  };

  var save = function(data) {
      $.ajax({
//        url: 'http://api.shareabouts.org/api/v2/demo-user/datasets/bigredbutton/places',
//        url: 'http://devsaapi-civicworks.dotcloud.com/api/v2/demo-user/datasets/demo-data/places',
//        url: 'http://127.0.0.1:8000/api/v2/demo-user/datasets/demo-data/places',
        url: 'http://data.shareabouts.org/api/v2/mjumbewu/datasets/philly-bike-share/places',
        type: 'POST',
        dataType: 'json',
        contentType: 'application/json',
        processData: false,
        data: data,
        success: function() {
          finishStep($('#save-information'));
          alert('It is known.');
        },
        error: function() {
          failStep($('#save-information'));
        }
      });
  };

  var reverseGeocode = function(lat, lng, callback) {
    var url = 'http://api.geonames.org/findNearestAddressJSON?lat='+lat+
      '&lng='+lng+'&username=openplans&callback=?';

    $.getJSON(url, function(data) {
      var address = [],
          props = ['streetNumber', 'street', 'adminName2', 'adminCode1'];

      if (data.address) {
        $.each(props, function(i, prop) {
          if (data.address[prop]) {
            address.push(data.address[prop]);
          }
        });

        data.address.formattedAddress = address.join(' ');
      } else {
        data = null;
      }

      callback(data);
    })

      // jqXhr request failure handler
      .fail(function() {
        failStep($('#find-address'));
      });
  };

  var startStep = function($step) {
    var opts = {
      lines: 13, // The number of lines to draw
      length: 0, // The length of each line
      width: 2, // The line thickness
      radius: 8, // The radius of the inner circle
      corners: 1, // Corner roundness (0..1)
      rotate: 0, // The rotation offset
      direction: 1, // 1: clockwise, -1: counterclockwise
      color: '#000', // #rgb or #rrggbb or array of colors
      speed: 1, // Rounds per second
      trail: 60, // Afterglow percentage
      shadow: false, // Whether to render a shadow
      hwaccel: false, // Whether to use hardware acceleration
      className: 'inner-spinner', // The CSS class to assign to the spinner
      zIndex: 2e9, // The z-index (defaults to 2000000000)
      top: 'auto', // Top position relative to parent in px
      left: 'auto' // Left position relative to parent in px
    }, spinner, $container;

    resetStep($step)
      .removeClass('not-started')
      .addClass('started');
    
    $container = $('<span class="spinner"></span>').prependTo($step);
    spinner = new Spinner(opts).spin($container[0]);

    return $step;
  };

  var finishStep = function($step) {
    resetStep($step)
      .removeClass('not-started')
      .addClass('done');

    $step.find('.badge')
      .html('<span class="glyphicon glyphicon-ok-circle"></span>');

    return $step;
  };

  var failStep = function($step) {
    resetStep($step)
      .removeClass('not-started')
      .addClass('failed');

    $step.find('.badge')
      .html('<span class="glyphicon glyphicon-remove-circle"></span>');

    return $step;
  };

  var resetStep = function($step) {
    $step.find('.badge').empty();
    $step.find('.spinner').remove();
    return $step
      .removeClass('started done failed')
      .addClass('not-started');
  };

  var resetSteps = function() {
    $('.step .badge').empty();
    $('.step').find('.spinner').remove();
    $('.step')
      .removeClass('started done failed')
      .addClass('not-started');
  };

  var getAccurateLocation = function() {
    resetSteps();
    startStep($('#get-latlng'));

    var onSuccess = function(position) {
      finishStep($('#get-latlng'));
      startStep($('#find-address'));

      reverseGeocode(position.coords.latitude, position.coords.longitude, function(data) {
        finishStep($('#find-address'));
        startStep($('#save-information'));

        var toSave = {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [position.coords.longitude, position.coords.latitude]
          },
          properties: {
            location_type: 'bigredbutton-press',
            accuracy: position.coords.accuracy,
            submitter_name: ip
          }
        };

        if (data) {
          $.extend(toSave, data.address);
          toSave.name = data.address.formattedAddress;
        }

        save(JSON.stringify(toSave));
      });
    };

    var onError = function() {
      failStep($('#get-latlng'));
      console.log('error', arguments);
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true
    });
  };

  if (navigator.geolocation) {
    $('#theonebutton').click(getAccurateLocation);

  } else {
    alert('Geolocation services are not supported by your browser.');
  }

  $.getJSON('http://jsonip.com/?callback=?', setIp);

};

/*****************************************************************************

CSRF Validation
---------------
Django protects against Cross Site Request Forgeries (CSRF) by default. This
type of attack occurs when a malicious Web site contains a link, a form button
or some javascript that is intended to perform some action on your Web site,
using the credentials of a logged-in user who visits the malicious site in their
browser.

Since the API proxy view sends requests that write data to the Shareabouts
service authenticated as the owner of this dataset, we want to protect the API
view against CSRF. In order to ensure that AJAX POST/PUT/DELETE requests that
are made via jQuery will not be caught by the CSRF protection, we use the
following code. For more information, see:
https://docs.djangoproject.com/en/1.4/ref/contrib/csrf/

*/

jQuery(document).ajaxSend(function(event, xhr, settings) {
    function getCookie(name) {
        var cookieValue = null;
        if (document.cookie && document.cookie != '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = jQuery.trim(cookies[i]);
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) == (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
    function sameOrigin(url) {
        // url could be relative or scheme relative or absolute
        var host = document.location.host; // host + port
        var protocol = document.location.protocol;
        var sr_origin = '//' + host;
        var origin = protocol + sr_origin;
        // Allow absolute or scheme relative URLs to same origin
        return (url == origin || url.slice(0, origin.length + 1) == origin + '/') ||
            (url == sr_origin || url.slice(0, sr_origin.length + 1) == sr_origin + '/') ||
            // or any other URL that isn't scheme relative or absolute i.e relative.
            !(/^(\/\/|http:|https:).*/.test(url));
    }
    function safeMethod(method) {
        return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
    }
    function emptyMethod(method) {
      return (/^(OPTIONS|DELETE)$/.test(method));
    }

    if (!safeMethod(settings.type) && sameOrigin(settings.url)) {
        xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
    }

    // If this is a DELETE request, explicitly set the data to be sent so that
    // the browser will calculate a value for the Content-Length header. Same
    // goes with OPTIONS requests.
    if (emptyMethod(settings.type)) {
        xhr.setRequestHeader("Content-Type", "application/json");
        settings.data = '{}';
    }
});

// Disable caching for all ajax calls. This is required because IE
// is ridiculous about the way it caches AJAX calls. If we don't do this,
// it won't even send send requests to the server and just assume that
// the content has not changed and return a 304. So strange. So sad.
jQuery.ajaxSetup ({
  cache: false,
  xhrFields: {
    // Send cookies with cross-origin requests.
    withCredentials: true
  }
});

main(BigRedButton, jQuery);
