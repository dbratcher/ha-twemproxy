var twemproxy = require('../');
var expect = require('chai').expect;
var redis = require('redis');

describe('Redis HA TwemProxy tests that', function() {

    describe('initial connection', function() {

        it('should get a twemproxy correctly with single twemproxy', function(done) {
            var endpoints = [{ host: '127.0.0.1', port: 26380}];
            var redisClient = twemproxy.createClient(endpoints);
            redisClient.on('ready', function() {
                expect(redisClient.host).to.equal('127.0.0.1');
                expect(redisClient.port).to.equal('26380');
                done();
            });
        });

        it('should get a twemproxy correctly with multiple twemproxy', function(done) {
            var endpoints = [
                { host: '127.0.0.1', port: 26380},
                { host: '127.0.0.1', port: 26379}
            ];
            var redisClient = twemproxy.createClient(endpoints);
            redisClient.on('ready', function() {
                expect(redisClient.host).to.equal('127.0.0.1');
                expect(redisClient.port).to.equal('26380');
                done();
            });
        });


        it('should get a twemproxy correctly with multiple twemproxy - one not active', function(done) {
            var endpoints = [
                { host: '127.0.0.1', port: 26378},
                { host: '127.0.0.1', port: 26380},
                { host: '127.0.0.1', port: 26379}
            ];
            var redisClient = twemproxy.createClient(endpoints);
            redisClient.on('ready', function() {
                expect(redisClient.host).to.equal('127.0.0.1');
                expect(redisClient.port).to.equal('26380');
                done();
            });
        });

        it('should get a twemproxy correctly with multiple twemproxy - one with a bad addr', function(){
            var endpoints = [
                { host: 'bad.addr', port: 26378},
                { host: '127.0.0.1', port: 26380},
                { host: '127.0.0.1', port: 26379}
            ];
            var redisClient = twemproxy.createClient(endpoints);
            expect(redisClient).to.be.an.instanceof(redis.RedisClient);
        });

        it('should give an error when no twemproxy are active', function(done) {
            var endpoints = [
                { host: '127.0.0.1', port: 26378},
                { host: '127.0.0.1', port: 26377},
                { host: '127.0.0.1', port: 26376}
            ];
            var redisClient = twemproxy.createClient(endpoints);
            redisClient.on('error', function(err){
                expect(err.message).to.equal('Failed to find a twemproxy from the endpoints');
                done();
            });
        });
    });
});