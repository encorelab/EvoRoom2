/*jslint devel: true, regexp: true, browser: true, unparam: true, debug: true, sloppy: true, sub: true, es5: true, vars: true, evil: true, fragment: true, white: true */
/*globals Sail, Rollcall, $, Foo */


// hide scan button in 1-3 until yes/no completed
// 'initialize scanner' is a bad name

var rainforestCounter = 0;
var dateChoice = null;
var firstInterview = false;
var secondInterview = false;

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
		$('#survey-organisms .next-rainforest').hide();
		$('#survey-organisms .finished').hide();
		$('#rotation-intro').hide();
		$('#rotation-note-taker').hide();
		$('#rotation-field-guide').hide();
		$('#rotation-prediction').hide();
		$('#rotation-next-rainforest').hide();
		$('#interview-intro').hide();
		$('#interview').hide();
		$('#group-notes').hide();
		$('#final-picks-ranking').hide();
		$('#final-picks-discuss').hide();
		$('#final-picks-choice').hide();
		$('#final-picks-debrief').hide();
	},
	
	barcodeScanSuccess: function(result) {
		alert("Got Barcode: " +result);
	},
	
	barcodeScanFailure: function(msg) {
	    alert("SCAN FAILED: "+msg);
	},

	setupPageLayout: function() {
		$('.jquery-radios').buttonset();

		$('#log-in-success .big-button').click(function() {
			$('#log-in-success').hide();
			$('#survey-welcome').show();
			$('#student-chosen-animals').show();
			// trigger the QR scan screen/module, but what is this scan for?
			alert("calling scanner now");
			window.plugins.barcodeScanner.scan(Sail.app.barcodeScanSuccess, Sail.app.barcodeScanFailure);		
		});

		$('#survey-welcome .big-button').click(function() {
			$('#survey-welcome').hide();
			$('#survey-organisms').show();
			// register the rainforest location, set (in a var? or pass it?)

			// clear radio buttons
			$('input:radio').prop('checked', false);
			$('#survey-organisms .radio').button('refresh');
		});
		
		// hide the buttons until user has made all choices on screen
		// this also needs to check if all of the rainforests are complete, then show small-button instead TODO
		$('#survey-organisms .radio').click(function() {
			if ( $('.first-radios').is(':checked') && $('.second-radios').is(':checked') ) {
				if (rainforestCounter > 2) {
					$('#survey-organisms .finished').show();
				}
				else {
					$('#survey-organisms .next-rainforest').show();
				}
			}
		});

		$('#survey-organisms .big-button').click(function() {
			// Sail.app.organismPresent() rename
			
			// perform QR scan

			// clear radio buttons
			$('input:radio').prop('checked', false);
			$('#survey-organisms .radio').button('refresh');
			$('#survey-organisms .next-rainforest').hide();
			
			// temporary until we can check for all rainforests
			rainforestCounter = rainforestCounter + 1;
		});

		$('#survey-organisms .small-button').click(function() {
			$('#survey-organisms').hide();
			$('#student-chosen-animals').hide();

			// check agent for which screen to show. Isn't there a better way to do this? Agent will be slow, at least TODO
			$('#rotation-intro').show();
		});


		$('#rotation-intro .big-button').click(function() {
			$('#rotation-intro').hide();
			// check which rainforest is next
			// check which role is next
			// doing them in order for now
			// check agent for which screen to show next TODO
			$('#rotation-note-taker').show();
		});

		$('#rotation-note-taker .small-button').click(function() {
			// EVENT TODO "rotation_submitted"
			$('#rotation-note-taker').hide();
			// check agent for which screen to show next TODO
			$('#rotation-field-guide').show();
		});

		$('#rotation-field-guide .small-button').click(function() {
			$('#rotation-field-guide').hide();
			// check agent for which screen to show next TODO
			$('#rotation-prediction').show();
		});

		$('#rotation-prediction .small-button').click(function() {
			$('#rotation-prediction').hide();
			// check agent for which screen to show next TODO
			$('#rotation-next-rainforest').show();
		});

		$('#rotation-next-rainforest .big-button').click(function() {
			// QR scan TODO
			$('#rotation-next-rainforest').hide();
			$('#interview-intro').show();
			// add waiting screen TODO
		});
		
		$('#interview-intro .first-date').click(function() {
			$('#interview-intro').hide();
			$('#interview').show();
			dateChoice = $('#interview-intro .first-date').text();
			$('#interview .interview-choice').text(dateChoice);
			firstInterview = true;
		});
		
		$('#interview-intro .second-date').click(function() {
			$('#interview-intro').hide();
			$('#interview').show();
			dateChoice = $('#interview-intro .second-date').text();
			$('#interview .interview-choice').text(dateChoice);
			secondInterview = true;
		});

		// this might be a: sloppy, b: dangerous (will they *always* have exactly 2 interviews?). Is there a better approach?
		$('#interview .small-button').click(function() {
			if (firstInterview && secondInterview) {
				$('#interview').hide();
				$('#group-notes').show();
				// EVENT TODO "interview_submitted"
				// grab stuff from db, populate .notes-table .first + .second TODO
			}
			else {
				$('#interview').hide();
				$('#interview-intro').show();
			}
		});

		$('#group-notes .sync-button').click(function() {
			// grab stuff from db, populate rest of .notes-table TODO
		});

		$('#group-notes .small-button').click(function() {
			$('#group-notes').hide();
			$('#final-picks-ranking').show();
		});

		$('#final-picks-ranking .small-button').click(function() {
			// EVENT TODO "rankings_submitted"
			$('#final-picks-ranking').hide();
			$('#final-picks-discuss').show();
			// fill in .discussion-content-question with question particular to the student
			// send event to agent, put the following as sail event listener at top? Will it be fast enough?
			// $('#final-picks-discuss .discussion-content-question').text('var);'
		});

		$('#final-picks-discuss .small-button').click(function() {
			// send out .discussion-content-text-entry content EVENT TODO "rationale_submitted"
			$('#final-picks-discuss').hide();
			$('#final-picks-choice').show();
		});

		$('#final-picks-choice .big-button').click(function() {
			// QR scan TODO
			$('#final-picks-choice').hide();
			$('#final-picks-debrief').show();
		});


	}
};
