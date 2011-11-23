/*jslint devel: true, regexp: true, browser: true, unparam: true, debug: true, sloppy: true, sub: true, es5: true, vars: true, evil: true, fragment: true, white: true */
/*globals Sail, Rollcall, $, Foo */

var EvoRoom = {
    rollcallURL: '/rollcall',

    events: {
        sail: {

        },

        initialized: function(ev) {
			Sail.app.hidePageElements();
            Sail.app.authenticate();
        },

        connected: function(ev) {

        },

        authenticated: function(ev) {
            Sail.app.setupPageLayout();
        },

        unauthenticated: function(ev) {
            Rollcall.Authenticator.requestRun();
        }
    },

    init: function() {
        Sail.app.rollcall = new Rollcall.Client(Sail.app.rollcallURL);

        Sail.app.run = Sail.app.run || JSON.parse($.cookie('run'));
        if (Sail.app.run) {
            Sail.app.groupchatRoom = Sail.app.run.name + '@conference.' + Sail.app.xmppDomain;
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
    },

	hidePageElements: function() {
		$('#survey-welcome').hide();
        $('#student-chosen-animals').hide();
        $('#survey-organisms').hide();
        $('#survey-organisms .small-button').hide();
        $('#rotation-intro').hide();
        $('#rotation-note-taker').hide();
        $('#rotation-field-guide').hide();
        $('#rotation-prediction').hide();
        $('#rotation-next-rainforest').hide();
        $('#speed-date-intro').hide();
	},

    setupPageLayout: function() {
        $('.jquery-radios').buttonset();

        $('#survey-welcome').hide();
        $('#student-chosen-animals').hide();
        $('#survey-organisms').hide();
        $('#survey-organisms .small-button').hide();
        $('#rotation-intro').hide();
        $('#rotation-note-taker').hide();
        $('#rotation-field-guide').hide();
        $('#rotation-prediction').hide();
        $('#rotation-next-rainforest').hide();
        $('#speed-date-intro').hide();


        $('#log-in-success .big-button').click(function() {
            $('#log-in-success').hide();
            $('#survey-welcome').show();
            $('#student-chosen-animals').show();
            // trigger the QR scan screen/module, but what is this scan for?
        });

        $('#survey-welcome .big-button').click(function() {
            $('#survey-welcome').hide();
            $('#survey-organisms').show();
            // register the rainforest location, set (in a var? or pass it?)

            // clear radio buttons
            $('input:radio').prop('checked', false);
            $('#survey-organisms .radio').button('refresh');
        });

        $('#survey-organisms .big-button').click(function() {
            // perform QR scan

            // clear radio buttons
            $('input:radio').prop('checked', false);
            $('#survey-organisms .radio').button('refresh');

            // when all but 1 rainforest is completed show, needs an if around it
            $('#survey-organisms .small-button').show();
            $('#survey-organisms .big-button').hide();
        });

        $('#survey-organisms .small-button').click(function() {
            $('#survey-organisms').hide();
            $('#student-chosen-animals').hide();
            $('#rotation-intro').show();
        });

        // TEMPORARY FOR TESTING, THE FOLLOWING 4 WILL BE DYNAMIC
        $('#rotation-intro .big-button').click(function() {
            $('#rotation-intro').hide();
            // check which rainforest is next
            // check which role is next
            // doing them in order for now
            $('#rotation-note-taker').show();
        });

        $('#rotation-note-taker .small-button').click(function() {
            $('#rotation-note-taker').hide();
            $('#rotation-field-guide').show();
        });

        $('#rotation-field-guide .small-button').click(function() {
            $('#rotation-field-guide').hide();
            $('#rotation-prediction').show();
        });

        $('#rotation-prediction .small-button').click(function() {
            $('#rotation-prediction').hide();
            $('#rotation-next-rainforest').show();
        });

        $('#rotation-next-rainforest .big-button').click(function() {
            $('#rotation-next-rainforest').hide();
            // if complete {
            $('#speed-date-intro').show();
            // else {
            // something else
            });

        }

};
