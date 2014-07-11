Highly Available Redis TwemProxy
================================

Wrapper around [node_redis](https://github.com/mranney/node_redis) creating a client pointing at a twemproxy instance which autoupdates if the current twemproxy instance goes down.

## Installation ##

  npm install ha-twemproxy --save
  
## Usage ##

```javascript
var twemproxy = require('ha-twemproxy');

// List the twemproxy endpoints
var endpoints = [
    {host: '127.0.0.1', port: 26379},
    {host: '127.0.0.1', port: 26380}
];

var opts = {}; // Standard node_redis client options - optional
var redisClient = twemproxy.createClient(endpoints, opts);

// redisClient is a normal redis client, except that if the twemproxy goes down
// it will keep checking the other twemproxy instances for another available instance of twemproxy and then connect to that.
// No need to monitor for reconnects etc - everything handled transparently
// Anything that persists over the normal node_redis reconnect will persist here. 
// Anything that doesn't, won't.

// An equivalent way of doing the above (if you don't want to have to pass the endpoints around all the time) is
var TwemProxy = twemproxy.TwemProxy(endpoints);
var masterClient = TwemProxy.createClient(opts);
```


## Tests ##
npm test

## Licence ##
MIT

## Credits ##
Heavily inspired by the node module [redis-sentinel](https://www.npmjs.org/package/redis-sentinel).
