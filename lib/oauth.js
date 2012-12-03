var request = require('request')
  , qs = require('querystring')
  , oauth = require('oauth');

/**
 * Get an Instagram access token.
 *
 * Note that this method requires an express app as part of the OAuth process.
 * Visit /instagram to start the authentication process. For more info, see
 * http://instagr.am/developer/auth/
 *
 * @param {String} client_id
 * @param {String} secret
 * @param {ExpressApp} app
 * @param {String} host - e.g. http://myapp.com/
 * @param {Function} callback - (err, access_token, user_data, response)
 * @api public
 */

exports.instagram = function (client_id, secret, app, host, callback) {
    var authorise_url = 'https://api.instagram.com/oauth/authorize'
      , access_url = 'https://api.instagram.com/oauth/access_token'
      , callback_path = '/instagram_callback';

    host = host.replace(/\/$/, '');

    //Create the endpoint that starts the auth process
    app.get('/instagram', function (request, response) {
        var url = authorise_url +
                '?client_id=' + client_id +
                '&redirect_uri=' + host + callback_path +
                '&response_type=code';
        response.redirect(url);
    });

    //Catch requests to the callback url
    app.get(callback_path, function (req, response) {
        function cb(err, access, user) {
            callback(err, access, user, response);
        }

        if (req.param('error')) {
            return cb(req.param('error_reason', 'auth error'));
        }

        var body = qs.stringify({
            client_id: client_id
          , client_secret: secret
          , grant_type: 'authorization_code'
          , redirect_uri: host + callback_path
          , code: req.param('code')
        });

        //Request the access token
        request({ method: 'post', url: access_url, body: body }, function (err, res, body) {
            if (err || !body || !~body.indexOf('access_token')) {
                return cb('verification failed');
            }
            try {
                body = JSON.parse(body);
            } catch (e) {
                return cb(e);
            }
            cb(null, body.access_token, body.user, response);
        });
    });
};

/**
 * Get a Twitter access token.
 *
 * Note that this method requires an express app as part of the OAuth process.
 * Visit /twitter to start the authentication process. For more info, see
 * https://dev.twitter.com/docs/api/1.1
 *
 * @param {String} key
 * @param {String} secret
 * @param {ExpressApp} app
 * @param {String} host - e.g. http://myapp.com/
 * @param {Function} callback - (err, access_token, user_data, response)
 * @api public
 */


exports.twitter = function (key, secret, app, host, callback) {
    var request_url = 'https://api.twitter.com/oauth/request_token'
      , authorise_url = 'https://api.twitter.com/oauth/authorize'
      , access_url = 'https://api.twitter.com/oauth/access_token'
      , callback_path = '/twitter_callback';

    host = host.replace(/\/$/, '');

    var twitter = new oauth.OAuth(
        request_url,
        access_url,
        key,
        secret,
        '1.0A',
        host + callback_path,
        'HMAC-SHA1'
    );

    //Create the endpoint that starts the auth process
    app.get('/twitter', function (request, response) {
        twitter.getOAuthRequestToken(function(err, token, secret) {
            if (err) {
                return callback(err, null, null, response);
            }
            request.session.request_token = token;
            request.session.request_secret = secret;
            response.redirect(authorise_url + '?oauth_token=' + token);
        });
    });

    //Catch requests to the callback url
    app.get(callback_path, function (request, response) {
        var request_token = request.session.request_token
          , request_secret = request.session.request_secret
          , verifier = request.param('oauth_verifier');
        twitter.getOAuthAccessToken(request_token, request_secret, verifier, function (err, token, secret, results) {
            if (err) {
                return callback(err, null, null, response);
            }
            request.session.access_token = token;
            request.session.access_secret = secret;
            callback(null, { token: token, secret: secret }, results.screen_name, response);
        });
    });
};

