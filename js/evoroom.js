/*jslint devel: true, regexp: true, browser: true, unparam: true, debug: true, sloppy: true, sub: true, es5: true, vars: true, evil: true, fragment: true, white: true */
/*globals Sail, Rollcall, $, Foo */

var EvoRoom = {
    currentGroupCode: null,
    currentRainforest: null,
    organismsRainforestsCompleted: false,
    firstRainforestAssigned: false,
    targetRainforest: null,
    rotationRainforestsCompleted: false,
    firstInterview: false,
    secondInterview: false,

    rollcallURL: '/rollcall',

    events: {
        sail: {
            /********************************************* INCOMING EVENTS *******************************************/
            start_step: function(ev) {
                if (ev.payload.user_name && ev.payload.user_name === Sail.app.session.account.login) {
                    if (ev.payload.step_id) {
                        if (ev.payload.step_id === "step1") {
                          console.log("We received start_step for step1 - nothing done with it right now!");
                        }
                        else if (ev.payload.step_id === "step2") {
                          console.log("We received start_step for step2");
                          Sail.app.hidePageElements();
                          $('#loading-page').show();
                        }
                        else if (ev.payload.step_id === "step3") {
                          console.log("We received start_step for step3");
                          Sail.app.hidePageElements();
                          $('#loading-page').show();
                        }
                    }
                    else {
                      console.warn("start_step event received, but payload contains no step_id");
                    }
                }
                else {
                    console.log("start_step event received, but not for this user");
                }
            },
            
            organisms_assignment: function(ev) {
                // check that message is for currently logged in user
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
            
            rainforests_completed_announcement: function(ev) {
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
                        organismsRainforestCompleted = false;
                        // show the button to scan a rainforest
                        $('#survey-organisms .next-rainforest').show();
                    }
                    // user did all the other forests and is done after this one
                    else if (ev.payload.completed_rainforests.length >= 3) {
                        organismsRainforestCompleted = true;
                        $('#survey-organisms .survey-content-box').show();
                    }
                    else {
                        organismsRainforestCompleted = false;
                        $('#survey-organisms .survey-content-box').show();
                    }
                   
                }
                else {
                    console.warn("location_assignment event received, but payload is either missing go_to_location, student, or both");
                }
            },

/*****************************************EVENTS ADDED FOR STEP 2***********************************************/            
            
            location_assignment: function(ev) {
                if (ev.payload.go_to_location && ev.payload.student === Sail.app.session.account.login) {
                	Sail.app.hidePageElements();
                	Sail.app.targetRainforest = ev.payload.go_to_location;
                    
                	if (Sail.app.firstRainforestAssigned) {
                		$('#rotation-next-rainforest .next-rainforest').text(Sail.app.formatRainforestString(Sail.app.targetRainforest));
                		$('#rotation-next-rainforest').show();
                	}
                	else {
	                	$('#rotation-intro .current-rainforest').text(Sail.app.formatRainforestString(Sail.app.targetRainforest));
	                	$('#rotation-intro').show();
	                	Sail.app.firstRainforestAssigned = true;
                	}
                }
                else {
                    console.warn("location_assignment event received, but payload is either missing go_to_location, student, or both");
                }
            },
            
            task_assignment: function(ev) {
            	if (ev.payload.task && ev.payload.student === Sail.app.session.account.login) {
                	Sail.app.hidePageElements();
                	// clear all fields
                	$('#rotation-note-taker .rainforest-explanation-text-entry').text('');
                    $('input:radio').prop('checked', false);
                    $('#rotation-note-taker .radio').button('refresh');
                    
                	if (ev.payload.task === "scribe") {
                		$('#rotation-note-taker .current-rainforest').text(Sail.app.formatRainforestString(Sail.app.currentRainforest));
                		$('#rotation-note-taker').show();
                	}
                	else if (ev.payload.task === "guide_looker_upper") {
                		$('#rotation-field-guide .current-rainforest').text(Sail.app.formatRainforestString(Sail.app.currentRainforest));
                		$('#rotation-field-guide').show();
                	}
                	else if (ev.payload.task === "prediction_looker_upper") {
                		$('#rotation-prediction .current-rainforest').text(Sail.app.formatRainforestString(Sail.app.currentRainforest));
                		$('#rotation-prediction').show();
                	}
                	else if (ev.payload.task === "guide_prediction_looker_upper") {
                		$('#rotation-field-guide .current-rainforest').text(Sail.app.formatRainforestString(Sail.app.currentRainforest));
                		$('#rotation-field-guide-and-prediction').show();
                	}
                }
                else {
                    console.warn("task_assignment event received, but payload is incomplete");
                }
            },
            
/*****************************************EVENTS ADDED FOR STEP 3***********************************************/
            interviewees_assigned: function(ev) {
                if (ev.payload.user_name && ev.payload.user_name === Sail.app.session.account.login) {
                    if (ev.payload.first_interviewee && ev.payload.second_interviewee) {
                        Sail.app.hidePageElements();
                        // set up first interviewee
                        $('#interview-intro .first-interviewee').text(ev.payload.first_interviewee);
                        // set up second interviewee
                        $('#interview-intro .second-interviewee').text(ev.payload.second_interviewee);
                        
                        $('#interview-intro').show();
                    }
                    else {
                        console.warn("interviewees_assigned event received, but payload is incomplete");
                    }
                }
                else {
                    console.log("interviewees_assigned event received, but not for this user");
                }
            }
            
/*****************************************EVENTS ADDED FOR STEP 4***********************************************/            
            
            
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
		$('#rotation-prediction').hide();
		$('#rotation-field-guide-and-prediction').hide();
		$('#group-page-frame').hide();
		$('#iframe-close-button').hide();
		$('#rotation-next-rainforest').hide();
		$('#interview-intro').hide();
		$('#interview').hide();
		$('#group-notes').hide();
		$('#final-picks-ranking').hide();
		$('#final-picks-discuss').hide();
		//$('#final-picks-discuss .question1').hide();
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
				if (Sail.app.organismsRainforestCompleted) {
					$('#survey-organisms .finished').show();
				}
				else {
					$('#survey-organisms .next-rainforest').show();
				}
			}
		});
		
        // on-click event to scan another rainforest
        $('#survey-organisms .big-button').click(function() {
            Sail.app.hidePageElements();
            
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
        	Sail.app.hidePageElements();
            
            // show wait screen and wait for start_step event to show rotation-intro
            $('#loading-page').show();
        });

/*************************************STEP 2***********************************************/
        
		$('#rotation-intro .big-button').click(function() {
			// QR scan at assigned rainforest
			window.plugins.barcodeScanner.scan(Sail.app.barcodeScanSuccessCheckLocationAssignment, Sail.app.barcodeScanFailure);
		});
		
		// notetaker submits whether they think this is their rainforest
		$('#rotation-note-taker .small-button').click(function() {
			Sail.app.submitRainforestGuess();
			Sail.app.hidePageElements();
			$('#loading-page').show();
		});
		
		// wiring in the stuff for iframes
		$('#rotation-field-guide .field-guide-link').click(function() {
			$('#field-guide-frame').show();
			$('#field-guide-frame').appendTo('#rotation-field-guide');
			$('#iframe-close-button').show();
			$('#iframe-close-button').appendTo('#rotation-field-guide');
		});

		// wiring in the stuff for iframes
		$('#rotation-prediction .group-page-link').click(function() {
			$('#group-page-frame').show();
			$('#group-page-frame').appendTo('#rotation-prediction');
			$('#iframe-close-button').show();
			$('#iframe-close-button').appendTo('#rotation-prediction');
		});
		
		// wiring in the stuff for iframes
		$('#rotation-field-guide-and-prediction .field-guide-link').click(function() {
			$('#field-guide-frame').show();
			$('#field-guide-frame').appendTo('#rotation-field-guide-and-prediction');
			$('#iframe-close-button').show();
			$('#iframe-close-button').appendTo('#rotation-field-guide-and-prediction');
		});

		// wiring in the stuff for iframes
		$('#rotation-field-guide-and-prediction .group-page-link').click(function() {
			$('#group-page-frame').show();
			$('#group-page-frame').appendTo('#rotation-field-guide-and-prediction');
			$('#iframe-close-button').show();
			$('#iframe-close-button').appendTo('#rotation-field-guide-and-prediction');
		});	
		
		// wiring in the stuff for iframes
		$('#iframe-close-button').click(function() {
			$('.iframe').hide();
			$('#iframe-close-button').hide();
		});
		
		$('#rotation-next-rainforest .big-button').click(function() {
			Sail.app.hidePageElements();
			window.plugins.barcodeScanner.scan(Sail.app.barcodeScanSuccessCheckLocationAssignment, Sail.app.barcodeScanFailure);
		});
		
		
/**************************************STEP 3***********************************************/	
        $('#interview-intro .first-interviewee').click(function() {
            $('#interview .interview-choice').text($('#interview-intro .first-interviewee').text());
            $('#interview-intro').hide();
            $('#interview').show();
            
            Sail.app.firstInterview = true;
            Sail.app.startInterview();
        });

        $('#interview-intro .second-interviewee').click(function() {
            $('#interview .interview-choice').text($('#interview-intro .second-interviewee').text());
            $('#interview-intro').hide();
            $('#interview').show();

            Sail.app.secondInterview = true;
            Sail.app.startInterview();
        });
        
        // this might be a: sloppy, b: dangerous (will they *always* have exactly 2 interviews?). Is there a better approach?
        $('#interview .small-button').click(function() {
            if (Sail.app.firstInterview && Sail.app.secondInterview) {
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

/**************************************STEP 4***********************************************/		

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
    
    barcodeScanSuccessCheckLocationAssignment: function(result) {
        console.log("Got Barcode: " +result);
        // hide everything
        Sail.app.hidePageElements();
        // check if they are at the correct place
        if (Sail.app.targetRainforest === result) {
        	Sail.app.currentRainforest = result;
            Sail.app.submitCheckIn();
            $('#loading-page').show();
        }
        // alert and send them back to the 5th screen
        else {
        	alert ("You are at the wrong location, please scan again at the correct location");
        	$('#rotation-next-rainforest').show();
        }

    },
    
    barcodeScanFailure: function(msg) {
        alert("SCAN FAILED: "+msg);
    },


	TO_BE_RENAMED: function() {
		var rainforestCounter = 0;		


		

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
			}
		});
	},
	
	formatRainforestString: function(rainforestString) {
		if (rainforestString === "rainforest_a") {
			return "Rainforest A";
		}
		else if (rainforestString === "rainforest_b") {
			return "Rainforest B";
		}
		else if (rainforestString === "rainforest_c") {
			return "Rainforest C";
		}
		else if (rainforestString === "rainforest_d") {
			return "Rainforest D";
		}
		else {
			return "unknown rainforest";
		}
	}
};
