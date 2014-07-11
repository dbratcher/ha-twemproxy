var redis = require('redis'),
    net = require('net'),
    Q = require('q');

function TwemProxy(endpoints) {

    // Instantiate if needed
    if (!(this instanceof TwemProxy)) {
        return new TwemProxy(endpoints);
    }

    this.endpoints = endpoints;
}

/**
 * Create a client
 * @param  {Object} opts       standard redis client options (optional)
 * @return {RedisClient}       the RedisClient for the desired endpoint
 */
TwemProxy.prototype.createClient = function(opts) {

    opts = opts || {};
  
    var endpoints = this.endpoints;

    var netClient = new net.Socket();
    var client = new redis.RedisClient(netClient, opts);

    var self = this;

    function connectClient(resolver) {
        return function(err, host, port) {
            if (err) {
                return client.emit('error', err);
            }

            client.port = port;
            client.host = host;
            client.stream.connect(port, host);

            // Hijack the emit method so that we can get in there and
            // do any reconnection on errors, before raising it up the
            // stack...
            var oldEmit = client.emit;
            client.emit = function(eventName) {

                // Has an error been hit?
                if (eventName === 'error') {
                    hitError.apply(null, arguments);
                } else {
                    // Not an error - call the real emit...
                    oldEmit.apply(client, arguments);
                }
            };
            
            client.on('reconnecting', refreshEndpoints);
            
            function refreshEndpoints() {
                resolver(self.endpoints, function(_err, ip, port) {
                    if (_err) { oldEmit.call(client, 'error', _err); }
                    // Try and reconnect
                    client.port = port;
                    client.host = ip;
                });
            }

            // Crude but may do for now. On error re-resolve the master
            // and retry the connection
            function hitError(eventName, err) {

                var _args = arguments;
                function reemit() {
                    oldEmit.apply(client, _args);
                }

                // If we are still connected then reraise the error - thats
                // not what we are here to handle
                if (client.connected) { return reemit(); }

                // In the background the client is going to keep trying to reconnect
                // and this error will keep getting raised - lets just keep trying
                // to get a new master...
                refreshEndpoints();
            }
        };
    }

    resolveTwemProxyClient(endpoints, connectClient(resolveTwemProxyClient));       

    return client;
};

function resolveClient() {
    var _i, __slice = [].slice;

    // The following just splits the arguments into the first argument (endpoints),
    // the last argument (callback) and then any arguments in the middle (args).
    var endpoints = arguments[0];
    var checkEndpointFn = arguments[1];
    var args = 4 <= arguments.length ? __slice.call(arguments, 2, _i = arguments.length - 1) : (_i = 2, []);
    var callback = arguments[_i++];

    var promise = Q.resolve();

    // Because finding the master is going to be an async list we will terminate
    // when we find one then use promises...
    promise = endpoints.reduce(function(soFar, endpoint) {
        return soFar.then(function() {
            var deferred = Q.defer();

            // Farily illegible way of passing (endpoint, arg1, arg2, ..., callback)
            // to checkEndpointFn
            checkEndpointFn.apply(null, [endpoint].concat(args, [function() {
                var err = arguments[0];
                if (err) {
                    deferred.resolve();
                } else {
                    // This is the endpoint that has responded so stick it on the top of
                    // the list
                    var index = endpoints.indexOf(endpoint);
                    endpoints.splice(index, 1);
                    endpoints.unshift(endpoint);

                    // Callback with whatever other arguments we've been given
                    var _args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
                    callback.apply(null, [null].concat(_args));
                }
            }]));
            return deferred.promise;
        });
    }, promise);

    promise = promise.then(function() {
        callback(new Error('Failed to find a twemproxy from the endpoints'));
    });

    // Catch the failure (if there is one)
    promise.fail(function(err) { callback(err); });
}

function isTwemProxyOk(endpoint, callback) {
    var client = redis.createClient(endpoint.port, endpoint.host);
    var callbackSent = false;
    client.on("error", function(err) {
        if (!callbackSent) {
            callbackSent = true;
            callback(err);
        }
        client.end();
    });

    // Send a command just to check we can...
    client.exists('test', function(err, resp) {
        if (callbackSent) { return; }
        callbackSent = true;
        if (err) { return callback(err); }
        callback(null, endpoint.host, String(endpoint.port));
    });
    client.quit();
}


function resolveTwemProxyClient(endpoints, masterName, callback) {
    resolveClient(endpoints, isTwemProxyOk, callback);
}

// Shortcut for quickly getting a client from endpoints
function createClient(endpoints, options) {
    var twemproxy = TwemProxy(endpoints);
    return twemproxy.createClient(options);
}

module.exports.TwemProxy = TwemProxy;
module.exports.createClient = createClient;
module.exports.redis = redis;
