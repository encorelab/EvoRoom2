/*jslint devel: true, regexp: true, browser: true, unparam: true, debug: true, sloppy: true, sub: true, es5: true, vars: true, evil: true, fragment: true, white: false */
/*globals Sail, Rollcall, $, Foo */

var EvoRoom = {
    rollcallURL: '/rollcall',
    
    events: {
        sail: {
            
        },
        
        initialized: function(ev) {
            Sail.app.authenticate();
        },
        
        connected: function(ev) {
        },
        
        authenticated: function(ev) {
        },
        
        unauthenticated: function(ev) {
            Rollcall.Authenticator.requestRun();
        }
    },
    
    init: function() {
        Sail.app.rollcall = new Rollcall.Client(Sail.app.rollcallURL);
        
        Sail.app.run = Sail.app.run || JSON.parse($.cookie('run'));
        if (Sail.app.run) {
            Sail.app.groupchatRoom = Sail.app.run.name+'@conference.'+Sail.app.xmppDomain;
        }
        
        Sail.modules
            .load('Rollcall.Authenticator', {mode: 'picker', askForRun: true, curnit: 'EvoRoom', userFilter: function(u) {return true; /*u.kind == "Student"*/}})
            .load('Strophe.AutoConnector')
            .load('AuthStatusWidget')
            .thenRun(function () {
                Sail.autobindEvents(EvoRoom);
                
                $(document).ready(function() {
                    $('#reload').click(function() {
                        Sail.Strophe.disconnect();
                        location.reload();
                    });
                });

                $(Sail.app).trigger('initialized');
                return true;
            });
    },
    
    authenticate: function() {
        Sail.app.token = Sail.app.rollcall.getCurrentToken();
        
        if (!Sail.app.run) {
            Rollcall.Authenticator.requestRun();
        } else if (!Sail.app.token) {
            Rollcall.Authenticator.requestLogin();
        } else {
            Sail.app.rollcall.fetchSessionForToken(Sail.app.token, 
                function(data) {
                    Sail.app.session = data.session;
                    $(Sail.app).trigger('authenticated');
                },
                function(error) {
                    console.warn("Token '"+Sail.app.token+"' is invalid. Will try to re-authenticate...");
                    Rollcall.Authenticator.unauthenticate();
                }
            );
        }
    }
    

};
