var fs = require('fs')
  , express = require('express')
  , oauth = require('./lib/oauth')
  , config;

try {
    config = require('./config.js');
} catch (e) {
    console.log('Failed to parse config.js: ' + e.message);
    process.exit(1);
}

var tokens = fs.createWriteStream(__dirname + '/tokens.csv', { flags: 'a' });

var app = express();

app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.session({ secret: 'foobar' }));

app.get('/', function (request, response) {
    response.setHeader('content-type', 'text/html');
    response.send([
        '<ul>',
          '<li><a href="/instagram">Instagram</a>',
          '<li><a href="/twitter">Twitter</a>',
        '</ul>'
    ].join('\n'));
});

var host = config.host + ':' + config.port;
if (!/^https:\/\//.test(host)) {
    host = 'http://' + host;
}

oauth.instagram(
    config.instagram.client_id
  , config.instagram.secret
  , app
  , host
  , function (err, token, user, response) {
    if (err) {
        return response.send(500);
    }
    tokens.write('instgram,' + user.username + ',' + user.id + ',' + token + '\n');
    response.send('Instagram token received. <a href="/">Back</a>');
});

oauth.twitter(
    config.twitter.key
  , config.twitter.secret
  , app
  , host
  , function (err, access, user, response) {
    if (err) {
        return response.send(500);
    }
    tokens.write('twitter,' + user + ',' + access.token + ',' + access.secret + '\n');
    response.send('Twitter token received. <a href="/">Back</a>');
});

console.log('Listening on %s:%s', config.host, config.port);
app.listen(config.port);
