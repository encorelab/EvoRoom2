/*jslint devel: true, regexp: true, browser: true, unparam: true, debug: true, sloppy: true, sub: true, es5: true, vars: true, evil: true, fragment: true, white: true */
/*globals Sail, Rollcall, $, Foo */

var EvoRoom = {
	currentGroupCode: null,
	currentRainforest: null,
		
	rollcallURL: '/rollcall',

	events: {
		sail: {

		},

		initialized: function(ev) {
			Sail.app.hidePageElements();
			Sail.app.authenticate();
		},

		authenticated: function(ev) {

		},

		connected: function(ev) {
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
            Sail.app.rollcall.fetchSessionForToken(Sail.app.token, function(data) {
                Sail.app.session = data.session;
                Sail.app.rollcall.request(Sail.app.rollcall.url + "/users/"+Sail.app.session.account.login+".json",
	                "GET", {}, function(data) {
	                    Sail.app.currentGroupCode = data.user.groups[0].name;
	                    $(Sail.app).trigger('authenticated');
	                });
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
		$('#student-chosen-organisms').hide();
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
		$('#final-picks-discuss .question2').hide();
		$('#final-picks-discuss .question3').hide();
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
		var rainforestCounter = 0;		
		var dateChoice = null;
		var firstInterview = false;
		var secondInterview = false;
		
		$('.jquery-radios').buttonset();

		$('#log-in-success .big-button').click(function() {
			$('#log-in-success').hide();
			$('#survey-welcome').show();
			$('#student-chosen-organisms').show();
			// trigger the QR scan screen/module, but what is this scan for?
			alert("calling scanner now");
			window.plugins.barcodeScanner.scan(Sail.app.barcodeScanSuccess, Sail.app.barcodeScanFailure);		
		});

		$('#survey-welcome .big-button').click(function() {
			$('#survey-welcome').hide();
			$('#survey-organisms').show();
			// put the rainforest into currentRainforest;

			// clear radio buttons
			$('input:radio').prop('checked', false);
			$('#survey-organisms .radio').button('refresh');
		});
		
		// hide the buttons until user has made all choices on screen
		// this also needs to check if all of the rainforests are complete, then show small-button instead TODO
		$('#survey-organisms .radio').click(function() {
			if ( $('.first-radios').is(':checked') && $('.second-radios').is(':checked') ) {
				// temp set to 0 instead of 2, for testing
				if (rainforestCounter > 0) {
					$('#survey-organisms .finished').show();
				}
				else {
					$('#survey-organisms .next-rainforest').show();
				}
			}
		});

		$('#survey-organisms .big-button').click(function() {
			Sail.app.submitOrganismsPresent();
			
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
			$('#student-chosen-organisms').hide();

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
			Sail.app.submitRainforestGuess();

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
				Sail.app.submitInterview();

				$('#interview').hide();
				$('#group-notes').show();
				// grab stuff from db, populate .notes-table .first + .second TODO
			}
			else {
				Sail.app.submitInterview();
				
				$('#interview .variable-dropdown').val('');
				$('#interview .interview-content-text-entry').val('');
				
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
			Sail.app.submitRankings();

			$('#final-picks-ranking').hide();
			$('#final-picks-discuss').show();
			// fill in .discussion-content-question with question particular to the student
			// send event to agent, put the following as sail event listener at top? Will it be fast enough?
			// $('#final-picks-discuss .discussion-content-question').text('var);'
		});

		$('#final-picks-discuss .small-button').click(function() {
			Sail.app.submitRationale();
			$('#final-picks-discuss').hide();
			$('#final-picks-choice').show();
		});

		$('#final-picks-choice .big-button').click(function() {
			// QR scan TODO
			$('#final-picks-choice').hide();
			$('#final-picks-debrief').show();
		});
	},
	
/********************************************* EVENTS *******************************************/

	submitOrganismsPresent: function() {
		var sev = new Sail.Event('organism_present', {
			group_code:EvoRoom.currentGroupCode,
			author:Sail.app.session.account.login,
			rainforest:EvoRoom.currentRainforest,
			first_organism:{
				organism:$('#survey-organisms .first-organism').val(),
				present:$('input:radio[name=first-organism-yn]:checked').val()
			},
			second_organism:{
				organism:$('#survey-organisms .second-organism').val(),
				present:$('input:radio[name=first-organism-yn]:checked').val()
			}
		});
		EvoRoom.groupchat.sendEvent(sev);
	},
	
	submitRainforestGuess: function() {
		var sev = new Sail.Event('rainforest_guess_submitted', {
			group_code:EvoRoom.currentGroupCode,
			author:Sail.app.session.account.login,
			rainforest:EvoRoom.currentRainforest,
			your_rainforest:$('input:radio[name=your-rainforest]:checked').val(),
			explanation:$('#rotation-note-taker .rainforest-explanation-text-entry').val()
		});
		EvoRoom.groupchat.sendEvent(sev);
	},
	
	submitInterview: function() {
		var sev = new Sail.Event('interview_submitted', {
			group_code:EvoRoom.currentGroupCode,
			author:Sail.app.session.account.login,
			variable:$('select.variable-dropdown').val(),
			notes:$('#interview .interview-content-text-entry').val()
		});
		EvoRoom.groupchat.sendEvent(sev);
	},
	
	submitRankings: function() {
		var sev = new Sail.Event('rankings_submitted', {
			group_code:EvoRoom.currentGroupCode,
			author:Sail.app.session.account.login,
	        ranks:{
	            rainforest_a:$('select.A-dropdown').val(),
	            rainforest_b:$('select.B-dropdown').val(),
	            rainforest_c:$('select.C-dropdown').val(),
	            rainforest_d:$('select.D-dropdown').val()
	        }
		});
		EvoRoom.groupchat.sendEvent(sev);
	},
	
	submitRationale: function() {
		var sev = new Sail.Event('rationale_submitted', {
			group_code:EvoRoom.currentGroupCode,
			author:Sail.app.session.account.login,
			question:$('#final-picks-discuss .discussion-content-question').attr('value'),
			answer:$('#final-picks-discuss .discussion-content-text-entry').val()
		});
		EvoRoom.groupchat.sendEvent(sev);
	}	
	
	
/****************************************** HELPER FUNCTIONS *************************************/


};
