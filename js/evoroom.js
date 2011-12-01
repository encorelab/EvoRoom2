/*jslint devel: true, regexp: true, browser: true, unparam: true, debug: true, sloppy: true, sub: true, es5: true, vars: true, evil: true, fragment: true, white: true */
/*globals Sail, Rollcall, $, Foo */

var EvoRoom = {
    currentGroupCode: null,
    currentRainforest: null,
    rainforestsCompleted: false,

    rollcallURL: '/rollcall',

    events: {
        sail: {
            /********************************************* INCOMING EVENTS *******************************************/
            start_step: function(ev) {
              if (ev.payload.step_id) {
                  if (ev.payload.step_id === "step1") {
                      console.log("We received start_step for step1 - nothing done with it right now!");
                  }
              }
              else {
                  console.warn("start_step event received, but payload contains no step_id");
              }
            },
            
            organisms_assignment: function(ev) {
                // check that message is for currently loged in user
                if (ev.payload.user_name && ev.payload.user_name === Sail.app.session.account.login) {
                    if (ev.payload.first_organism && ev.payload.second_organism) {
                        Sail.app.hidePageElements();
                        // make sure the survey welcome screen come up with the animals received
                        $('#survey-welcome').show();
                        // assign right organisms according to event
                        $('#student-chosen-organisms .first-organism').attr('src', '/images/' + ev.payload.first_organism + '_icon.png');
                        $('#student-chosen-organisms .second-organism').attr('src', '/images/' + ev.payload.second_organism + '_icon.png');
                        $('#student-chosen-organisms').show();
                    }
                    else {
                        console.warn("location_assignment event received, but payload is either missing first_organism, second_organism, or both");
                    }
                }
                else {
                    console.log("organisms_assignment event received but NOT for this user");
                }
            },
            
            rainforests_completed: function(ev) {
                if (ev.payload.completed_rainforests) {
                    Sail.app.hidePageElements();
                    $('#survey-organisms').show();
                    // clear radio buttons
                    $('input:radio').prop('checked', false);
                    $('#survey-organisms .radio').button('refresh');
                    
                    // check if the user already did this rainforest
                    if ( _.find(ev.payload.completed_rainforests, function (rainforest) { return rainforest === Sail.app.currentRainforest; }) ) {
                        // show message and disable radio buttons - user must scan again
                        alert("Rainforest already done! Please scan another rainforest");
                        $('#survey-organisms .survey-content-box').hide();
                        rainforestsCompleted = false;
                        // show the button to scan a rainforest
                        $('#survey-organisms .next-rainforest').show();
                    }
                    // user did all the other forests and is done after this one
                    else if (ev.payload.completed_rainforests.length >= 3) {
                        rainforestsCompleted = true;
                        $('#survey-organisms .survey-content-box').show();
                    }
                    else {
                        rainforestsCompleted = false;
                        $('#survey-organisms .survey-content-box').show();
                    }
                    
                }
                else {
                    console.warn("location_assignment event received, but payload is either missing go_to_location, student, or both");
                }
            },

            location_assignment: function(ev) {
                if (ev.payload.student && ev.payload.go_to_location) {
                    
                }
                else {
                    console.warn("location_assignment event received, but payload is either missing go_to_location, student, or both");
                }
            }
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
		$('#loading-page').hide();
		$('#log-in-success').hide();
		$('#survey-welcome').hide();
		$('#student-chosen-organisms').hide();
		$('#survey-organisms').hide();
		$('#survey-organisms .next-rainforest').hide();
		$('#survey-organisms .finished').hide();
		$('#rotation-intro').hide();
		$('#rotation-note-taker').hide();
		$('#rotation-field-guide').hide();
		$('#field-guide-frame').hide();
		$('#group-page-frame').hide();
		$('#iframe-close-button').hide();
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

    setupPageLayout: function() {
        $('.jquery-radios').buttonset();
        
        $('#log-in-success').show();

        $('#log-in-success .big-button').click(function() {
            // trigger the QR scan screen/module to scan room entry
            window.plugins.barcodeScanner.scan(Sail.app.barcodeScanSuccessRoomLogin, Sail.app.barcodeScanFailure);
        });
        
        $('#survey-welcome .big-button').click(function() {
            // trigger the QR scan screen/module to scan rainforests
            window.plugins.barcodeScanner.scan(Sail.app.barcodeScanSuccessRainforest, Sail.app.barcodeScanFailure);
        });
        
        // setting up 3 on-click events for survey-organism
        $('#survey-organisms .radio').click(function() {
            if ( $('.first-radios').is(':checked') && $('.second-radios').is(':checked') ) {
				// decission about completion is made in event handler for rainforests_completed
				if (rainforestsCompleted) {
					$('#survey-organisms .finished').show();
				}
				else {
					$('#survey-organisms .next-rainforest').show();
				}
			}
		});
		
        // on-click event to scan another rainforest
        $('#survey-organisms .big-button').click(function() {
            $('#survey-organisms .next-rainforest').hide();
            
            // Caution: we only send the event here to allow the user to change yes/no
            // only send the organisms_present event if both radio buttons are checked
            if ( $('.first-radios').is(':checked') && $('.second-radios').is(':checked') ) {
                Sail.app.submitOrganismsPresent();
            }
            
            // clear radio buttons
            $('input:radio').prop('checked', false);
            $('#survey-organisms .radio').button('refresh');
            
            // trigger the QR scan screen/module to scan rainforests
            window.plugins.barcodeScanner.scan(Sail.app.barcodeScanSuccessRainforest, Sail.app.barcodeScanFailure);
        });

        // on-click event to finish step1
        $('#survey-organisms .small-button').click(function() {
            $('#survey-organisms').hide();
            $('#student-chosen-organisms').hide();
            
            // show wait screen and wait for start_step event to show rotation-intro
            $('#loading-page').show();

            // check agent for which screen to show. Isn't there a better way to do this? Agent will be slow, at least TODO
            //$('#rotation-intro').show();
        });

    },
    
    barcodeScanSuccessRoomLogin: function(result) {
        console.log("Got Barcode: " +result);
        // send out event check_in
        Sail.app.currentRainforest = result;
        Sail.app.submitCheckIn();
        // hide everything
        Sail.app.hidePageElements();
        // show waiting page
        $('#loading-page').show();
    },

    barcodeScanFailure: function(msg) {
        alert("SCAN FAILED: "+msg);
    },
    
    barcodeScanSuccessRainforest: function(result) {
        console.log("Got Barcode: " +result);
        // send out event check_in
        Sail.app.currentRainforest = result;
        Sail.app.submitCheckIn();
        // hide everything
        Sail.app.hidePageElements();
        // show waiting page
        $('#loading-page').show();
    },


	TO_BE_RENAMED: function() {
		var rainforestCounter = 0;		
		var dateChoice = null;
		var firstInterview = false;
		var secondInterview = false;
		
		$('.jquery-radios').buttonset();


		$('#rotation-intro .big-button').click(function() {
			$('#rotation-intro').hide();
			// check which rainforest is next
			// check which role is next
			// doing them in order for now
			// check agent for which screen to show next TODO
			$('#rotation-note-taker').show();
		});

		// this will be removed eventually TODO
		$('#rotation-note-taker .small-button').click(function() {
			Sail.app.submitRainforestGuess();

			$('#rotation-note-taker').hide();
			// check agent for which screen to show next TODO
			$('#rotation-field-guide').show();
		});

		// this will be removed eventually TODO
		$('#rotation-field-guide .small-button').click(function() {
			$('#rotation-field-guide').hide();
			// check agent for which screen to show next TODO
			$('#rotation-next-rainforest').show();
		});
/*
		// this will be removed eventually TODO
		$('#rotation-prediction .small-button').click(function() {
			$('#rotation-prediction').hide();
			// check agent for which screen to show next TODO
			$('#rotation-next-rainforest').show();
		});*/

		$('#rotation-field-guide .field-guide-link').click(function() {
			$('#field-guide-frame').show();
			$('#field-guide-frame').appendTo('#rotation-field-guide');
			$('#iframe-close-button').show();
			$('#iframe-close-button').appendTo('#rotation-field-guide');
		});
		
		$('#rotation-prediction .group-page-link').click(function() {
			$('#group-page-frame').show();
			$('#group-page-frame').appendTo('#rotation-prediction');
			$('#iframe-close-button').show();
			$('#iframe-close-button').appendTo('#rotation-prediction');
		});
		
		$('#iframe-close-button').click(function() {
			$('.iframe').hide();
			$('#iframe-close-button').hide();
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
			Sail.app.startInterview();
		});
		
		$('#interview-intro .second-date').click(function() {
			$('#interview-intro').hide();
			$('#interview').show();
			dateChoice = $('#interview-intro .second-date').text();
			$('#interview .interview-choice').text(dateChoice);
			secondInterview = true;
			Sail.app.startInterview();
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
			Sail.app.getInterviews();
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
	
/********************************************* OUTGOING EVENTS *******************************************/
    submitCheckIn: function() {
        var sev = new Sail.Event('check_in', {
			group_code:Sail.app.currentGroupCode,
			rainforest:Sail.app.currentRainforest
		});
		EvoRoom.groupchat.sendEvent(sev);
    },

	submitOrganismsPresent: function() {
		var sev = new Sail.Event('organism_present', {
			group_code:Sail.app.currentGroupCode,
			author:Sail.app.session.account.login,
			rainforest:Sail.app.currentRainforest,
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
			group_code:Sail.app.currentGroupCode,
			author:Sail.app.session.account.login,
			rainforest:Sail.app.currentRainforest,
			your_rainforest:$('input:radio[name=your-rainforest]:checked').val(),
			explanation:$('#rotation-note-taker .rainforest-explanation-text-entry').val()
		});
		EvoRoom.groupchat.sendEvent(sev);
	},
	
	startInterview: function() {
		var sev = new Sail.Event('interview_started', {
			group_code:Sail.app.currentGroupCode,
			author:Sail.app.session.account.login,
			interviewee:$('#interview .interview-choice').text()
		});
		EvoRoom.groupchat.sendEvent(sev);
	},		
	
	submitInterview: function() {
		var sev = new Sail.Event('interview_submitted', {
			group_code:Sail.app.currentGroupCode,
			author:Sail.app.session.account.login,
			interviewee:$('#interview .interview-choice').text(),
			variable:$('select.variable-dropdown').val(),
			notes:$('#interview .interview-content-text-entry').val()
		});
		EvoRoom.groupchat.sendEvent(sev);
	},
	
	submitRankings: function() {
		var sev = new Sail.Event('rankings_submitted', {
			group_code:Sail.app.currentGroupCode,
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
			group_code:Sail.app.currentGroupCode,
			author:Sail.app.session.account.login,
			question:$('#final-picks-discuss .discussion-content-question').attr('value'),
			answer:$('#final-picks-discuss .discussion-content-text-entry').val()
		});
		EvoRoom.groupchat.sendEvent(sev);
	},	
	
	
/****************************************** HELPER FUNCTIONS *************************************/

	getInterviews: function() {
		$.ajax({
			type: "GET",
			url: "/mongoose/evoroom/events/_find",
			data: {criteria: JSON.stringify({"run.name":Sail.app.run.name, "eventType":"interview_submitted", "payload.group_code":Sail.app.currentGroupCode})},
			context: {},		//should this be changed?
			success: function(data) {
				//criteria = {"run.name":Sail.app.run.name, "eventType":"interview_submitted", "payload.group_code":Sail.app.currentGroupCode};

				if (data.ok === 1) {
					for (x = 1; x < 7; x++) {
						$('#group-notes .researcher.'+x).text(data.results[x-1].payload.interviewee);
						if (data.results[x-1].payload.variable) {
							$('#group-notes .variable.'+x).text(data.results[x-1].payload.variable);
						}
						else {
							$('#group-notes .variable.'+x).text('');
						}
						if (data.results[x-1].payload.notes) {
							$('#group-notes .notes.'+x).text(data.results[x-1].payload.notes);
						}
						else {
							data.results[x-1].payload.notes;
						}
					}
				}
				
/*				$.each($('#group-notes .researcher'), function() {
					$(this).text('
				});  */
			}
		});
	}

};
