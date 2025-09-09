/*
	SELFDRIVEN CORE API;
	https://slfdrvn.io/apps

	“get-learners”
	”get-learning-partners”
	“get-connections”
	“get-skills”
	“add-skill”
	“get-achievements”
	“add-achievement”
	“add-token”
	“get-contacts-organisation”
	“get-contacts-person”
	“get-projects”

	"get-community-members"
	“add-community-member"
	"verify-community-member"

	"hey-octo-protect-data-encrypt"
	"hey-octo-protect-data-decrypt"

	“hey-octo" {task: "add-project"}

	Depends on;
	https://learn.entityos.cloud/learn-function-automation

	---

	This is a lambda compliant node app with a wrapper to process data from API Gateway & respond to it.

	To run it on your local computer your need to install
	https://www.npmjs.com/package/lambda-local and then run as:

	lambda-local -l index.js -t 9000 -e event.json

	API Gateway docs:
	- https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html
	
	Authentication:
	Get apikey in the event data, and using user in settings.json get the username based on matching GUID
	The use the authKey in the event data as the password with the username.
	!! In production make sure the settings.json is unrestricted data with functional restriction to setup_user
	!!! The apiKey user has restricted data (based on relationships) and functional access

	Event Data:
	{
	  "body": {
	    "apikey": "e7849d3a-d8a3-49c7-8b27-70b85047e0f1"
	  },
	  "queryStringParameters": {},
	  "headers": {}
	}

	event/passed data available via request contect in the app scope.
	eg
		var request = entityos.get(
		{
			scope: 'app',
			context: 'request'
		});
		
		>

		{ 
			body: {},
			queryString: {},
			headers: {}
		}

	"app-auth" checks the apikey sent against users in the space (as per settings.json)
	
	Run:
	lambda-local -l index.js -t 9000 -e event-add-community-member-lab.json
	lambda-local -l index.js -t 9000 -e event-add-community-member-signup-lab.json

	lambda-local -l index.js -t 9000 -e event-add-community-member-commonlands-lab.json
	
	lambda-local -l index.js -t 9000 -e event-add-community-member-uow-passport-lab.json
	lambda-local -l index.js -t 9000 -e event-verify-community-member-uow-passport-lab.json
	lambda-local -l index.js -t 9000 -e event-hey-octo-uow-passport-lab.json

	lambda-local -l index.js -t 9000 -e event-hey-octo-protect-data-encrypt-lab.json
	lambda-local -l index.js -t 9000 -e event-hey-octo-protect-data-decrypt-lab.json
	
	Upload to AWS Lambda:
	!!! CHECK THE SETTINGS.JSON // lab/prod?? // password??
	zip -r ../selfdriven-core-api-DDMMMYYYY-n.zip *
*/

exports.handler = function (event, context, callback)
{
	var entityos = require('entityos')
	var entityosProtect = require('entityos/entityos.protect.js');
	var _ = require('lodash')
	var moment = require('moment');

	entityos._util.message('1.0.1');
	entityos._util.message(event)

	if (event.isBase64Encoded)
	{
		event.body = Buffer.from(event.body, 'base64').toString('utf-8');
	}

	console.log(event)

	if (_.isString(event.body))
	{
		if (_.startsWith(event.body, 'ey'))
		{
			event.body = JSON.parse(Buffer.from(event.body, 'base64').toString('utf-8'));
		}
		else
		{
			event.body = JSON.parse(event.body);
		}
	}

	if (_.isString(event.body.data))
	{
		if (_.startsWith(event.body.data, 'ey'))
		{
			event.body.data = JSON.parse(Buffer.from(event.body, 'base64').toString('utf-8'));
		}
		else
		{
			event.body.data = JSON.parse(event.body.data);
		}
	}

	if (_.has(event, 'body._context'))
	{
		event.context = event.body._context;
	}

	if (event.context == undefined && _.has(event, 'body.data._context'))
	{
		event.context = event.body.data._context;
	}

	entityos.set(
	{
		scope: '_event',
		value: event
	});

	entityos.set(
	{
		scope: '_context',
		value: context
	});

	/*
		Use promise to responded to API Gateway once all the processing has been completed.
	*/

	const promise = new Promise(function(resolve, reject)
	{	
		entityos.init(main)

		function main(err, data)
		{
			/*
				app initialises with entityos.invoke('app-init') after controllers added.
			*/

			entityos.add(
			{
				name: 'app-init',
				code: function ()
				{
					entityos._util.message('Using entityos module version ' + entityos.VERSION);
					entityos._util.message(entityos.data.session);

					var eventData = entityos.get(
					{
						scope: '_event'
					});

					var request =
					{ 
						body: {},
						queryString: {},
						headers: {}
					}

					if (eventData != undefined)
					{
						request.queryString = eventData.queryStringParameters;
						request.headers = eventData.headers;

						if (_.isString(eventData.body))
						{
							request.body = JSON.parse(eventData.body)
						}
						else
						{
							request.body = eventData.body;
						}	
					}

					if (request.headers['x-api-key'] != undefined)
					{
						var _xAPIKey = _.split(request.headers['x-api-key'], '|');
						
						if (_xAPIKey.length == 0)
						{
							entityos.invoke('util-end', {error: 'Bad x-api-key in header [' + request.headers['x-api-key'] + '] - it should be {apiKey} or {apiKey}|{authKey}.'}, '401');
						}
						else
						{
							if (_xAPIKey.length == 1)
							{
								request.body.apikey = _xAPIKey[0];
							}
							else
							{
								request.body.apikey = _xAPIKey[0];
								request.body.authkey = _xAPIKey[1];
							}
						}
					}

					if (request.headers['x-auth-key'] != undefined)
					{
						request.body.authkey = request.headers['x-auth-key'];
					}

					entityos.set(
					{
						scope: '_request',
						value: request
					});

					/*entityos.set(
					{
						scope: 'app',
						context: 'request',
						value: request
					});*/

					entityos.set(
					{
						scope: '_data',
						value: request.body.data
					});

					if (_.includes(['x'], request.body.method))
					{
						entityos.invoke('app-start');
					}
					else
					{
						if (request.body.apikey != undefined)
						{
							if (request.body.authkey != undefined)
							{
								entityos.invoke('app-auth');
							}
							else
							{
								if (request.body.method == 'add-community-member'
										|| request.body.method == 'hey-octo-protect-data-encrypt'
										|| request.body.method == 'hey-octo-protect-data-decrypt'
								)
								{
									entityos.invoke('app-start');
								}
								else
								{
									entityos.invoke('util-end', {error: 'Missing authKey'}, '401');
								}
							}
						}
						else
						{
							entityos.invoke('app-start');
						}
					}
				}
			});

			entityos.add(
			{
				name: 'app-auth',
				code: function (param)
				{
					var request = entityos.get(
					{
						scope: '_request'
					});

					var requestApiKeyGUID = request.body.apikey;

					entityos.cloud.search(
					{
						object: 'setup_user',
						fields: [{name: 'username'}],
						filters:
						[
							{
								field: 'guid',
								comparison: 'EQUAL_TO',
								value: encodeURIComponent(requestApiKeyGUID)
							}
						],
						callback: 'app-auth-process'
					});
				}
			});

			entityos.add(
			{
				name: 'app-auth-process',
				code: function (param, response)
				{
					console.log(response)

					entityos.set(
					{
						scope: 'app',
						context: 'user',
						value: response
					});

					if (response.status == 'ER')
					{
						entityos.invoke('util-end', {error: 'Error processing user authentication.'}, '401');
					}
					else
					{
						if (response.data.rows.length == 0)
						{
							var request = entityos.get(
							{
								scope: '_request'
							});

							var requestApiKeyGUID = request.body.apikey;

							entityos.invoke('util-end', {error: 'Bad apikey [' + requestApiKeyGUID + ']'}, '401');
						}
						else
						{
							var user = _.first(response.data.rows);

							var request = entityos.get(
							{
								scope: '_request'
							});

							var requestAuthKeyGUID = request.body.authkey;

							entityos.logon('app-auth-logon-process',
							{
								logon: user.username,
								password: requestAuthKeyGUID
							});
						}
					}
				}
			});

			entityos.add(
			{
				name: 'app-auth-logon-process',
				code: function (response)
				{
					if (response.status == 'ER')
					{
						entityos.invoke('util-end', {error: 'Bad authkey [' + requestAuthKeyGUID + ']'}, '401');
					}
					else
					{
						console.log(response);

						entityos.set(
						{
							scope: 'app',
							context: 'user',
							value: response
						});

						entityos.invoke('app-user');
					}
				}
			});

			entityos.add(
			{
				name: 'app-user',
				code: function (param)
				{
					entityos.cloud.invoke(
					{
						method: 'core_get_user_details',
						callback: 'app-user-process'
					});
				}
			});

			entityos.add(
			{
				name: 'app-user-process',
				code: function (param, response)
				{
					console.log(response)

					entityos.set(
					{
						scope: 'app',
						context: 'user',
						value: response
					})

					entityos.invoke('app-start')
				}
			});

			entityos.add(
			{
				name: 'util-uuid',
				code: function (param)
				{
					var pattern = entityos._util.param.get(param, 'pattern', {"default": 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'}).value;
					var scope = entityos._util.param.get(param, 'scope').value;
					var context = entityos._util.param.get(param, 'context').value;

					var uuid = pattern.replace(/[xy]/g, function(c) {
						    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
						    return v.toString(16);
						  });

					entityos.set(
					{
						scope: scope,
						context: context,
						value: uuid
					})
				}
			});

			entityos.add(
			{
				name: 'app-log',
				code: function ()
				{
					var eventData = entityos.get(
					{
						scope: '_event'
					});

					entityos.cloud.invoke(
					{
						object: 'core_debug_log',
						fields:
						{
							data: JSON.stringify(eventData),
							notes: 'app Log (Event)'
						}
					});

					var requestData = entityos.get(
					{
						scope: '_request'
					});

					entityos.cloud.invoke(
					{
						object: 'core_debug_log',
						fields:
						{
							data: JSON.stringify(requestData),
							notes: 'app Log (Request)'
						}
					});

					var contextData = entityos.get(
					{
						scope: '_context'
					});

					entityos.cloud.invoke(
					{
						object: 'core_debug_log',
						fields:
						{
							data: JSON.stringify(contextData),
							notes: 'appLog (Context)'
						},
						callback: 'app-log-saved'
					});
				}
			});

			entityos.add(
			{
				name: 'app-log-saved',
				code: function (param, response)
				{
					entityos._util.message('Log data saved to entityos.cloud');
					entityos._util.message(param);
					entityos._util.message(response);
				
					entityos.invoke('app-respond')
				}
			});

			entityos.add(
			{
				name: 'app-respond',
				code: function (param)
				{
					var response = entityos.get(
					{
						scope: 'app',
						context: 'response'
					});

					var statusCode = response.httpStatus;
					if (statusCode == undefined) {statusCode = '200'}

					var body = response.data;
					if (body == undefined) {body = {}}

					var headers = response.headers;
					if (headers == undefined) {headers = {}}

					let httpResponse =
					{
						statusCode: statusCode,
						headers: headers,
						body: JSON.stringify(body)
					};

					resolve(httpResponse)
				}
			});

			entityos.add(
			{
				name: 'util-end',
				code: function (data, statusCode)
				{
					if (statusCode == undefined) { statusCode: '200' }

					entityos.set(
					{
						scope: 'app',
						context: 'response',
						value: {data: data, statusCode: statusCode}
					});

					entityos.invoke('app-respond')
				}
			});

			entityos.add(
			{
				name: 'app-start',
				code: function ()
				{
					var request = entityos.get(
					{
						scope: '_request'
					});

					var data = request.body;
					var mode = data.mode;
					var method = data.method;

					if (_.isString(mode))
					{
						mode = {type: mode, status: 'OK'}
					}

					if (mode == undefined)
					{
						mode = {type: 'live', status: 'OK'}
					}

					if (mode.status == undefined)
					{
						mode.status = 'OK';
					}

					mode.status = mode.status.toUpperCase();

					if (mode.type == 'reflect')
					{
						var response = {}

						if (mode.data != undefined)
						{
							response.data = mode.data;
						}
						
						entityos.invoke('util-uuid',
						{
							scope: 'guid',
							context: 'log'
						});

						entityos.invoke('util-uuid',
						{
							scope: 'guid',
							context: 'audit'
						});

						response.data = _.assign(response.data,
						{
							status: mode.status,
							method: method,
							reflected: data,
							guids: entityos.get(
							{
								scope: 'guid'
							})
						});

						entityos.set(
						{
							scope: 'app',
							context: 'response',
							value: response
						});

						entityos.invoke('app-respond');
					}
					else
					{
						entityos.invoke('app-process');
					}
				}
			});

			//-- METHODS

			entityos.add(
			{
				name: 'app-process',
				code: function ()
				{
					var request = entityos.get(
					{
						scope: '_request'
					});

					var data = request.body;
					var method = data.method;

					entityos.set({scope: '_data', value: request.body.data});

					/*
					“get-community-members” (“get-learners”|”get-learning-partners”)
					*/
	
					if (_.includes(
					[
						'get-learners',
						'get-learning-parters',
						'get-connections',
						'get-skills',
						'add-skill',
						'get-achievements',
						'add-achievement',
						'add-token',
						'get-contacts-organisation',
						'get-contacts-person',
						'get-projects',
						'get-community-members',
						'add-community-member',
						'add-community-member-process-email-document',
						'hey-octo',
						'verify-community-member',
						'hey-octo-protect-data-encrypt',
						'hey-octo-protect-data-decrypt'
					],
						method))
					{
						entityos.invoke('app-process-' + method)
					}
					else
					{
						entityos.set(
						{
							scope: 'app',
							context: 'response',
							value:
							{
								status: 'ER',
								data: {error: {code: '2', description: 'Not a valid method [' + method + ']'}}
							}
						});

						entityos.invoke('app-respond');
					}
				}
			});

			// "get-community-members"
			entityos.add(
			{
				name: 'app-process-get-community-members',
				code: function ()
				{
					var request = entityos.get(
					{
						scope: '_request'
					});

					var data = request.body.data;

					if (data == undefined)
					{
						entityos.invoke('util-end', 
						{
							error: 'Missing data.'
						},
						'403');
					}
					else
					{
						//Example call to entityos

						var filters = [];

						if (data.firstname != '')
						{
							filters = _.concat(filters,
							[
								{
									field: 'firstname',
									comparison: 'EQUAL_TO',
									value: encodeURIComponent(data.firstname)
								}
							]);
						}

						entityos.cloud.search(
						{
							object: 'contact_person',
							fields:
							[
								{name: 'firstname'},
								{name: 'surname'},
								{name: 'guid'},
								{name: 'etag'},
								{name: 'modifieddate'}
							],
							filters: filters,
							sorts:
							[
								{
									name: 'firstname', 
									direction: 'asc'
								}
							],
							rows: 99999,
							callback: 'app-process-get-community-members-response'
						});
					}
				}
			});

			entityos.add(
			{
				name: 'app-process-get-community-members-response',
				code: function (param, response)
				{
					if (response.status == 'ER')
					{
						entityos.invoke('util-end', {error: 'Can not process request.'}, '500');
					}
					else
					{
						var data = [];

						_.each(response.data.rows, function (row)
						{
							data.push(
							{
								firstname: entityos._util.clean(row['firstname']),
								lastname: entityos._util.clean(row['surname']),
								guid: row['guid'],
								etag: row['etag'],
								modifieddatetime: row['modifieddate']
							})
						});

						entityos.invoke('util-end',
						{
							method: 'get-community-members',
							status: 'OK',
							data: data
						},
						'200');
					}
				}
			});

			// "add-community-member"

			entityos.add(
			{
				name: 'app-process-add-community-member',
				code: function ()
				{
					var data = entityos.get({scope: '_data'});

					if (data == undefined)
					{
						entityos.invoke('util-end', 
						{
							error: 'Missing data.'
						},
						'403');
					}
					else
					{
						if (data.communitykey == undefined)
						{
							entityos.invoke('util-end', 
							{
								error: 'Missing communitykey.'
							},
							'403');
						}
						else
						{
							let memberOK = (data.memberkey != undefined)

							if (!memberOK) 
							{
								memberOK = (data.memberfirstname != undefined
												&& data.memberlastname != undefined);
								if (memberOK)
								{
									memberOK = (data.memberemail != undefined || data.membermobile != undefined)
								}
							}

							if (!memberOK) 
							{
								entityos.invoke('util-end', 
								{
									error: 'Missing at least one of the following: memberkey or (memberfirstname, memberlastname or (email or mobile)).'
								},
								'403');
							}
							else
							{
								// Todo Check that conversation with selfdrivenOcto for doing this and key - hash of conversation ID and post if invite.

								// 1. Check community (guid) is valid
								// 2. Check if already member - else add
								// 3. Check if already user (email) - else add - with check on roles etc
								// 4. If has source: contactperson: then create a relationship with them as learning-partner

								entityos.invoke('app-process-add-community-member-process');
							}
						}
					}
				}
			});

			entityos.add(
			{
				name: 'app-process-add-community-member-process',
				code: function ()
				{
					entityos.invoke('app-process-add-community-member-process-community');
				}
			});

			entityos.add(
			{
				name: 'app-process-add-community-member-process-community',
				code: function ()
				{
					// Check valid community based on community: (guid)
					var data = entityos.get({scope: '_data'});

					entityos.cloud.search(
					{
						object: 'contact_business',
						fields: [{name: 'tradename'}],
						filters:
						[
							{
								field: 'guid',
								comparison: 'EQUAL_TO',
								value: encodeURIComponent(data.communitykey)
							},
							{
								field: 'primarygrouptext',
								comparison: 'EQUAL_TO',
								value: 'Community'
							}
						],
						callback: 'app-process-add-community-member-process-community-response'
					});
				}
			});

			entityos.add(
			{
				name: 'app-process-add-community-member-process-community-response',
				code: function (param, response)
				{
					if (response.data.rows.length == 0)
					{
						entityos.invoke('util-end', {error: 'Bad Community Key [PrimaryGroup == Community'}, '401');
					}
					else
					{
						const community = _.first(response.data.rows);
						var data = entityos.get({scope: '_data'});

						entityos.set(
						{
							scope: 'add-community-member',
							context: 'community',
							value: community
						});

						var filters = [];

						if (_.has(data, 'memberkey'))
						{
							filters.push(
							{
								field: 'guid',
								comparison: 'EQUAL_TO',
								value: encodeURIComponent(decodeURIComponent(data.memberkey))
							});
						}
						else
						{
							filters.push(
							{
								field: 'firstname',
								comparison: 'EQUAL_TO',
								value: decodeURIComponent(data.memberfirstname)
							});

							filters.push(
							{
								field: 'surname',
								comparison: 'EQUAL_TO',
								value: decodeURIComponent(data.memberlastname)
							});

							if (_.has(data, 'memberemail'))
							{
								filters.push(
								{
									field: 'email',
									comparison: 'EQUAL_TO',
									value: decodeURIComponent(data.memberemail)
								});
							}

							if (_.has(data, 'membermobile'))
							{
								filters.push(
								{
									field: 'mobile',
									comparison: 'EQUAL_TO',
									value: decodeURIComponent(data.membermobile)
								});
							}
						}
							
						entityos.cloud.search(
						{
							object: 'contact_person',
							fields: [{name: 'guid'}, {name: 'contactbusiness'}, {name: 'email'}, {name: 'mobile'}, {name: 'firstname'}, {name: 'surname'}, {name: 'contactperson.user.id'}],
							filters: filters,
							callback: 'app-process-add-community-member-process-member-response'
						});
					}
				}
			});

			entityos.add(
			{
				name: 'app-process-add-community-member-process-member-response',
				code: function (param, response)
				{
					if (response.data.rows.length == 0)
					{
						entityos.invoke('app-process-add-community-member-process-member-save');
					}
					else
					{
						const dataMember = _.first(response.data.rows);

						entityos.set(
						{
							scope: 'add-community-member',
							context: 'member',
							value: dataMember
						});

						if (dataMember['contactperson.user.id'] != '')
						{
							entityos.invoke('util-end',
							{
								status: 'ER',
								error: 'Community member already has a user account.',
								errorName: 'community-member-user-account-exists',
								errorCode: '5EMM3E'
							}, '401');
						}
						else
						{
							const data = entityos.get({scope: '_data'});

							//TODO - update this if multiple key-pairs - split by '|' then chech each one for contactperson:

							if (_.includes(data.source, 'contactperson:'))
							{
								entityos.invoke('app-process-add-community-member-process-member-relationship');
							}
							else
							{
								entityos.invoke('app-process-add-community-member-process-member-user');
							}
						}
					}
				}
			});

			entityos.add(
			{
				name: 'app-process-add-community-member-process-member-save',
				code: function (param, response)
				{
					const settings = entityos.get({scope: '_settings'});

					if (response == undefined)
					{
						let contactbusiness;

						if (_.has(settings, 'selfdriven.community.contactbusiness'))
						{
							contactbusiness = settings.selfdriven.community.contactbusiness;
						}

						if (contactbusiness == undefined)
						{
							const community = entityos.get(
							{
								scope: 'add-community-member',
								context: 'community'
							});

							contactbusiness = community.id
						}

						if (contactbusiness == undefined)
						{
							entityos.invoke('util-end',
							{
								error: 'Missing community settings.',
								errorName: 'community-settings-missing',
								errorCode: 'HCHSHJ'
							}, '401');
						}
						else
						{
							const dataCommunityMember = entityos.get(
							{
								scope: 'add-community-member'
							});

							if (dataCommunityMember.saved)
							{
								entityos.invoke('util-end', {error: 'Trying to save the contact again!'}, '401');
							}
							else
							{
								var data = entityos.get({scope: '_data'});
								const settings = entityos.get({scope: '_settings'});

								/*
									EmailVerificationNotes	{code: ''}	 
									EmailVerificationProvider	2 "Internal" once available - ignore for now
									EmailVerificationStatus	Numeric	1=Unverified, 2=Verified, 3=Failed Verification
								*/

								dataCommunityMember.verificationcode = entityos._util.generateRandomText({length: 6, referenceNumber: true});

								let verificationNotes = JSON.stringify(
								{
									code: dataCommunityMember.verificationcode
								});

								var saveData = 
								{
									contactbusiness: contactbusiness,
									firstname: data.memberfirstname,
									surname: data.memberlastname,
									emailverificationstatus: 1,
									emailverificationnotes: verificationNotes,
									sourceofcontact: settings.selfdriven.sourceofcontact.selfSignupEmailUnverified,
									notes: 'Self Sign Up'
								}

								if (_.has(data, 'memberemail'))
								{
									saveData.email = data.memberemail;
								}

								if (_.has(data, 'membermobile'))
								{
									saveData.mobile = data.membermobile;
								}

								let _sourceofcontactinfo =
								{
									code: dataCommunityMember.verificationcode
								}

								if (_.has(data, 'source'))
								{
									//saveData.sourceofcontact = 5 // Referral
									_sourceofcontactinfo = _.merge(_sourceofcontactinfo, {source: data.source});
								}

								saveData.sourceofcontactinfo = JSON.stringify(_sourceofcontactinfo)

								//TODO add primary group based on memberrole and settings for ID

								if (data.memberrole == 'uow-passport'
									&& _.has(settings, 'selfdriven.contactgroups.learner'))
								{
									saveData.primarygroup = settings.selfdriven.contactgroups.learner;
								}

								dataCommunityMember.saved = true;

								entityos.set(
								{
									scope: 'add-community-member',
									value: dataCommunityMember
								});

								console.log(saveData)

								entityos.cloud.save(
								{
									object: 'contact_person',
									data: saveData,
									callback: 'app-process-add-community-member-process-member-save'
								});
							}
						}
					}
					else
					{
						entityos.invoke('app-process-add-community-member-process-community');
					}
				}
			});

			entityos.add(
			{
				name: 'app-process-add-community-member-process-member-relationship',
				code: function (param, response)
				{	
					const data = entityos.get({scope: '_data'});

					const dataMember = entityos.get(
					{
						scope: 'add-community-member',
						context: 'member'
					});

					entityos.invoke('app-process-add-community-member-process-member-user');

					//TODO
					/*
					var otherContactPersons = entityos.get({scope: 'admin-community-member-summary-learning-partner-edit-othercontactperson', context: '_data'});
					var otherContactPerson = _.find(otherContactPersons, function (contactPerson)
					{
						return (contactPerson.id == data.othercontactperson)
					});

					if (_.isSet(otherContactPerson))
					{
						data.othercontactbusiness = otherContactPerson.contactbusiness;
					}

					data.contactperson = dataContext.id;
					data.contactbusiness = dataContext.contactbusiness;
					

					if (_.isUndefined(response))
					{
						entityos.cloud.save(
						{
							object: 'contact_relationship',
							data: data,
							callback: 'app-process-add-community-member-process-member-relationship'
						});
					}
					else
					{	
						if (response.status == 'OK')
						{
							entityos.invoke('app-process-add-community-member-process-member-user');
						}
					}
					*/
				}
			});

			entityos.add(
			{
				name: 'app-process-add-community-member-process-member-user',
				code: function (param, response)
				{
					// Currently has to exist as contact_person
					// To do: if new contact based on conv with Octo

					// Add to User Role
					// Send Email // Community Doc ID // Set on community contact_business

					// Todo: userdataaccesstype: '4' -- by sharing rules
					// https://docs.entityos.cloud/setup_user_manage

					const settings = entityos.get({scope: '_settings'});

					const dataCommunityMember = entityos.get(
					{
						scope: 'add-community-member'
					});

					var data = entityos.get({scope: '_data'});

					dataCommunityMember.member.username = data.memberusername;

					if (dataCommunityMember.member.username == undefined)
					{
						dataCommunityMember.member.username = dataCommunityMember.member.email;
					}

					if (dataCommunityMember.member.username == undefined)
					{
						dataCommunityMember.member.username = dataCommunityMember.member.mobile;
					}

					dataCommunityMember.member.userpassword = data.memberuserpassword;

					if (dataCommunityMember.member.userpassword == undefined)
					{
						dataCommunityMember.member.userpassword = entityos.invoke('util-generate-random-text');
					}
					
					var username = dataCommunityMember.member.username;

					if (username == '')
					{
						entityos.invoke('util-end',
						{
							error: 'Username is blank.',
							errorName: 'user-name-blank',
							errorCode: '6P4WMA'
						}, '401');
					}
					else
					{
						var useLogonSuffix = false;

						if (useLogonSuffix && _.has(settings, 'selfdriven.logonSuffix'))
						{
							username = username + settings.selfdriven.logonSuffix;
						}

						var saveData = 
						{
							contactbusiness: dataCommunityMember.community.id,
							contactperson: dataCommunityMember.member.id,
							disabled: 'N',
							userdataaccesstype: '3',
							unrestrictedaccess: 'N',
							authenticationusingaccesstoken: 1,
							authenticationlevel: '2',
							authenticationdelivery: '3',
							newsalerts: 'N',
							username: username,
							userpassword: dataCommunityMember.member.userpassword,
							urlaccesstype: 1
						}

						if (_.has(data, 'memberusername'))
						{
							saveData.passwordexpiry = moment().add(3650, 'days').format("DD-MMM-YYYY");
						}
						else
						{
							saveData.passwordexpiry = moment().subtract(1, 'days').format("DD-MMM-YYYY");
						}

						entityos.set(
						{
							scope: 'add-community-member',
							value: dataCommunityMember
						});
								
						entityos.cloud.save(
						{
							object: 'setup_user',
							data: saveData,
							callback: 'app-process-add-community-member-process-member-user-response'
						});
					}
				}
			});

			entityos.add(
			{
				name: 'app-process-add-community-member-process-member-user-response',
				code: function (param, response)
				{
					if (response.status == 'ER')
					{
						console.log(response.error);
						entityos.invoke('util-end', {error: 'Error creating the user.'}, '401');
					}
					else
					{
						let dataCommunityMember = entityos.get(
						{
							scope: 'add-community-member'
						});

						dataCommunityMember.user = {id: response.id}

						entityos.set(
						{
							scope: 'add-community-member',
							value: dataCommunityMember
						});

						entityos.invoke('app-process-add-community-member-process-member-userrole');
					}
				}
			});

			entityos.add(
			{
				name: 'app-process-add-community-member-process-member-userrole',
				code: function (param, response)
				{
					const settings = entityos.get({scope: '_settings'});
					var data = entityos.get({scope: '_data'});

					const dataCommunityMember = entityos.get(
					{
						scope: 'add-community-member'
					});

					const _userrole = _.find(settings.selfdriven.userroles, function (userrole)
					{
						return (userrole.name == data.memberrole)
					});

					if (_userrole == undefined)
					{
						entityos.invoke('app-process-add-community-member-process-email');
					}
					else
					{
						if (dataCommunityMember.user.id == undefined)
						{
							entityos.invoke('util-end', {error: 'Can not add role as no user ID set.'}, '401');
						}
						else
						{
							var saveData = 
							{
								role: _userrole.id,
								user: dataCommunityMember.user.id
							}

							console.log(saveData);
								
							entityos.cloud.save(
							{
								object: 'setup_user_role',
								data: saveData,
								callback: 'app-process-add-community-member-process-email'
							});
						}
					}
				}
			});

			entityos.add(
			{
				name: 'app-process-add-community-member-process-email',
				code: function ()
				{
					var data = entityos.get({scope: '_data'});
					const settings = entityos.get({scope: '_settings'});

					if (data.memberemail != undefined && _.has(settings, 'selfdriven.documents.signUpEmail'))
					{
						entityos.invoke('app-process-add-community-member-process-email-document');
					}
					else
					{
						entityos.invoke('app-process-add-community-member-process-finalise');
					}
				}
			});

			entityos.add(
			{
				name: 'app-process-add-community-member-process-email-document',
				code: function ()
				{
					const settings = entityos.get({scope: '_settings'});

					entityos.cloud.search(
					{
						object: 'document',
						fields: [{name: 'content'}, {name: 'title'}],
						filters:
						[
							{
								field: 'id',
								comparison: 'EQUAL_TO',
								value: encodeURIComponent(settings.selfdriven.documents.signUpEmail)
							}
						],
						callback: 'app-process-add-community-member-process-email-document-response'
					});
				}
			});

			entityos.add(
			{
				name: 'app-process-add-community-member-process-email-document-response',
				code: function (param, response)
				{
					if (response.data.rows.length == 0)
					{
						entityos.invoke('util-end', {error: 'Can not send the email - missing template document.'}, '401');
					}
					else
					{
						const dataDocument = _.first(response.data.rows);

						dataDocument.content = _.unescape(dataDocument.content);

						const settings = entityos.get({scope: '_settings'});

						const dataCommunityMember = entityos.get(
						{
							scope: 'add-community-member'
						});

						console.log(dataDocument.content);

						if (settings.selfdriven.emailCaption == undefined)
						{
							settings.selfdriven.emailCaption = settings.selfdriven.email;
						}

					

						const context = '{' + 
							'"email":"' + dataCommunityMember.member.email + '",' +
							'"verificationcode":"' + dataCommunityMember.verificationcode + '"' +
						'}';

						var contextBase58 = entityos._util.toBase58(context);
						let url = _.first(settings.selfdriven.uris) + '/verify#:z' + contextBase58; // z prefix means it is base58

						if (settings.selfdriven.verifyLinkCaption == undefined)
						{
							settings.selfdriven.verifyLinkCaption = url;
						}

						const verificationcodelink = '<a href="https://' + url + '" target="_blank">' + settings.selfdriven.verifyLinkCaption + '</a>'

						console.log(verificationcodelink);

						dataDocument.content = _.replace(dataDocument.content, '{{username}}', dataCommunityMember.member.username);
						dataDocument.content = _.replace(dataDocument.content, '{{firstname}}', dataCommunityMember.member.firstname);
						dataDocument.content = _.replace(dataDocument.content, '{{lastname}}', dataCommunityMember.member.lastname);
						dataDocument.content = _.replace(dataDocument.content, '{{email}}', dataCommunityMember.member.email);
						dataDocument.content = _.replace(dataDocument.content, '{{userpassword}}', dataCommunityMember.member.userpassword);
						dataDocument.content = _.replace(dataDocument.content, '{{email}}', settings.selfdriven.email);
						dataDocument.content = _.replace(dataDocument.content, '{{emailcaption}}', settings.selfdriven.emailCaption);
						dataDocument.content = _.replace(dataDocument.content, '{{url}}', settings.selfdriven.url);
						dataDocument.content = _.replace(dataDocument.content, '{{verificationcode}}', dataCommunityMember.verificationcode);
						dataDocument.content = _.replace(dataDocument.content, '{{verificationcodelink}}', verificationcodelink);

						console.log(dataDocument.content);

						entityos.set(
						{
							scope: 'add-community-member',
							context: 'document',
							value: dataDocument
						});

						entityos.invoke('app-process-add-community-member-process-email-send');
					}
				}
			});

			entityos.add(
			{
				name: 'app-process-add-community-member-process-email-send',
				code: function (param, response)
				{
					const settings = entityos.get({scope: '_settings'});
	
					const dataCommunityMember = entityos.get(
					{
						scope: 'add-community-member'
					});

					console.log(dataCommunityMember)

					var sendData =
					{
						fromemail: settings.selfdriven.email,
						to: dataCommunityMember.member.email,
						saveagainstcontactperson: dataCommunityMember.member.id,
						saveagainstcontactbusiness: dataCommunityMember.community.id,
						subject: dataCommunityMember.document.title,
						message: dataCommunityMember.document.content
					}

					console.log(sendData);

					//sendData.to = 'mark.byers@selfdriven.foundation';

					entityos.cloud.invoke(
					{
						method: 'messaging_email_send',
						data: sendData,
						callback: 'app-process-add-community-member-process-email-send-response'
					});

				}
			});

			entityos.add(
			{
				name: 'app-process-add-community-member-process-email-send-response',
				code: function (param, response)
				{
					if (response.status == 'ER')
					{
						entityos.invoke('util-end', {error: 'Error sending the email.'}, '401');
					}
					else
					{
						entityos.invoke('app-process-add-community-member-process-finalise');
					}
				}
			});


			entityos.add(
			{
				name: 'app-process-add-community-member-process-finalise',
				code: function (param)
				{
					const dataCommunityMember = entityos.get(
					{
						scope: 'add-community-member'
					});

					//userpassword should be via an email sent based on community settings

					var responseData =
					{
						username: dataCommunityMember.member.username
					}

					entityos.invoke('util-end',
					{
						method: 'add-community-member',
						status: 'OK',
						data: responseData
					},
					'200');
				}
			});

			// "verify-community-member"
			// generate and email code
			// verify code sent with email address

			entityos.add(
			{
				name: 'app-process-verify-community-member',
				code: function ()
				{
					var data = entityos.get({scope: '_data'});

					if (data == undefined)
					{
						entityos.invoke('util-end', 
						{
							error: 'Missing data.'
						},
						'403');
					}
					else
					{
						if (data.type == undefined)
						{
							data.type = 'check-email'
						}

						if (data.type = 'check-email' && (data.code == undefined || data.email == undefined))
						{
							entityos.invoke('util-end', 
							{
								error: 'Missing code or email address.'
							},
							'403');
						}
						else
						{
							entityos.invoke('app-process-verify-community-member-process');
						}
					}
				}
			});

			entityos.add(
			{
				name: 'app-process-verify-community-member-process',
				code: function (param, response)
				{
					var data = entityos.get({scope: '_data'});

					if (response == undefined)
					{
						var filters =
						[
							{
								field: 'email',
								comparison: 'EQUAL_TO',
								value: encodeURIComponent(data.email)
							}
						]

						entityos.cloud.search(
						{
							object: 'contact_person',
							fields:
							[
								{name: 'emailverificationstatus'},
								{name: 'emailverificationnotes'},
								{name: 'sourceofcontact'},
								{name: 'sourceofcontactinfo'},
								{name: 'guid'}
							],
							filters: filters,
							rows: 1,
							callback: 'app-process-verify-community-member-process'
						});
					}
					else
					{
						if (response.status == 'ER')
						{
							entityos.invoke('util-end', {error: 'Can not process request.'}, '500');
						}
						else
						{
							if (response.data.rows.length == 0)
							{
								entityos.invoke('util-end', 
								{
									error: 'Not a valid email address.'
								},
								'403');
							}
							else
							{
								let memberContact = _.first(response.data.rows);
								const settings = entityos.get({scope: '_settings'});

								memberContact._emailVerified = 
								(
									(memberContact.emailverificationstatus == 2)
									|| (memberContact.sourceofcontact == settings.selfdriven.sourceofcontact.selfSignupEmailVerified)
								)

								if (memberContact._emailVerified)
								{
									entityos.invoke('util-end',
									{
										method: 'verify-community-member',
										status: 'OK',
										data: {message: 'Already verified'}
									},
									'200');
								}
								else
								{
									if (_.first(memberContact.emailverificationnotes) == '{' || _.first(memberContact.sourceofcontactinfo) == '{')
									{
										if (_.first(memberContact.emailverificationnotes) == '{')
										{
											memberContact._emailverificationnotes = JSON.parse(memberContact.emailverificationnotes);
										}

										if (_.first(memberContact.sourceofcontactinfo) == '{')
										{
											memberContact._sourceofcontactinfo = JSON.parse(memberContact.sourceofcontactinfo);
										}

										memberContact._codeVerified =
										(
											(data.code == _.get(memberContact, '_emailverificationnotes.code'))
											|| (data.code == _.get(memberContact, '_sourceofcontactinfo.code'))
										)

										if (!memberContact._codeVerified)
										{
											entityos.invoke('util-end', 
											{
												error: 'Verification code is not valid for this email address.'
											},
											'403');
										}
										else
										{
											var saveData = 
											{
												sourceofcontact: settings.selfdriven.sourceofcontact.selfSignupEmailVerified,
												emailverificationstatus: 2,
												id: memberContact.id
											}

											entityos.cloud.save(
											{
												object: 'contact_person',
												data: saveData,
												callback: 'app-process-verify-community-member-process-finalise'
											});
										}
									}
									else
									{
										entityos.invoke('util-end', 
										{
											error: 'Verification has not been intiated.  You need to request a email verification code.'
										},
										'403');
									}
								}
							}
						}
					}
				}
			});

			entityos.add(
			{
				name: 'app-process-verify-community-member-process-finalise',
				code: function (param, response)
				{
					if (response == undefined)
					{
						entityos.invoke('util-end', 
						{
							error: 'There was an error process.'
						},
						'403');
					}
					else
					{
						entityos.invoke('util-end',
						{
							method: 'verify-community-member',
							status: 'OK',
							data: {message: 'Email address has been verified.', verified: true}
						},
						'200');
					}
					
				}
			});

			// "hey-octo"

			entityos.add(
			{
				name: 'app-process-hey-octo',
				code: function ()
				{
					const event = entityos.get({scope: '_event'});
				
					if (!_.has(event, '_user'))
					{
						entityos.invoke('util-conversation-check');
					}
					else
					{
						entityos.invoke('app-process-hey-octo-do-task');
					}
				}
			});

			entityos.add(
			{
				name: 'app-process-hey-octo-do-task',
				code: function ()
				{
					var data = entityos.get({scope: '_data'});

					if (!_.has(data, 'task'))
					{
						entityos.invoke('util-end', 
						{
							error: 'Missing the task (please give something to do).'
						},
						'403');
					}
					else
					{
						let task = _.get(data, 'task'); 

						if (task.name == undefined)
						{
							entityos.invoke('util-end', 
							{
								error: 'Missing the task name (what task I do?).'
							},
							'403');
						}
						else
						{
							if (_.includes['add-project'], task.name)
							{
								entityos.invoke('app-process-hey-octo-do-task-' + task.name)
							}
							else
							{
								var responseData =
								{
									method: 'hey-octo',
									status: 'ER',
									data: {error: {code: 'NRN2TB', description: 'Not a valid task for hey-octo [' + task.name + ']'}} 
								}

								entityos.invoke('util-end', responseData, '403');
							}
						}
					}
				}
			});

			entityos.add(
			{
				name: 'app-process-hey-octo-do-task-add-project',
				notes: 'Create a project for the tracking of the Profile Who (Am I / Are You) data based on the community linked template (.util)',
				code: function (param, response)
				{
					var data = entityos.get({scope: '_data'});
					let task = _.get(data, 'task'); 

					if (response == undefined)
					{
						console.log(task.data)

						entityos.cloud.save(
						{
							object: 'project',
							data: task.data,
							callback: 'app-process-hey-octo-do-task-add-project',
							callbackParam: param
						});
					}
					else
					{
						if (response.status == 'OK')
						{
							entityos.set(
							{
								scope: 'app-process-hey-octo-do-task-add-project',
								context: 'project',
								value: _.merge(task.data, {id: response.id})
							});

							entityos.invoke('app-process-hey-octo-do-task-add-project-process-team', param)
						}
					}
				}
			});

			entityos.add(
			{
				name: 'app-process-hey-octo-do-task-add-project-process-team',
				notes: 'Add the default team based on settings > selfdriven.projects.team',
				code: function (param, response)
				{
					const settings = entityos.get({scope: '_settings'});
					var data = entityos.get({scope: '_data'});
					const project = entityos.get(
					{
						scope: 'app-process-hey-octo-do-task-add-project',
						context: 'project'
					});

					if (response == undefined)
					{
						if (!_.has(settings, 'selfdriven.projects.teams'))
						{
							entityos.invoke('app-process-hey-octo-do-task-add-project-process-team-init', param)
						}
						else
						{
							//See if project just created has a match in the settings.

							let teamProject = project.sourceprojecttemplate;
							
							if (teamProject == undefined && project.parentproject != undefined)
							{
								teamProject = project.parentproject
							}

							const settingsProjectOcto = _.find(settings.selfdriven.projects.teams, function(team)
							{
								return (team.octo == true)
							});

							const settingsProject = _.find(settings.selfdriven.projects.teams, function(team)
							{
								return (team.id == teamProject)
							});

							if (settingsProject == undefined)
							{
								entityos.invoke('app-process-hey-octo-do-task-add-project-process-team-init', param)
							}
							else
							{
								let projects = [teamProject];

								if (settingsProjectOcto != undefined)
								{
									projects.push(settingsProjectOcto)
								}

								entityos.cloud.search(
								{
									object: 'project_team',
									fields: [{name: 'contactperson'}, {name: 'projectrole'}, {name: 'project'}],
									filters:
									[
										{
											field: 'project',
											comparison: 'IN_LIST',
											value: projects.join(',')
										}
									],
									callback: 'app-process-hey-octo-do-task-add-project-process-team'
								});
							}
						}
					}
					else
					{
						if (response.status == 'ER')
						{
							entityos.invoke('app-process-hey-octo-do-task-add-project-process-team-init', param)
						}
						else
						{
							if (response.data.rows.length == 0)
							{
								entityos.invoke('app-process-hey-octo-do-task-add-project-response',
								{
									response: {warning: 'Team project template has not team set.'}
								});
							}
							else
							{
								if (response.status == 'OK')
								{
									// At some point reduce list for duplicates / non-octo added first
									
									entityos.set(
									{
										scope: 'app-process-hey-octo-do-task-add-project',
										context: 'teams',
										value: response.data.rows
									});

									entityos.invoke('app-process-hey-octo-do-task-add-project-process-team-init', param)
								}
							}
						}
					}
				}
			});

			entityos.add(
			{
				name: 'app-process-hey-octo-do-task-add-project-process-team-init',
				code: function (param)
				{
					const settings = entityos.get({scope: '_settings'});

					var teams = entityos.get(
					{
						scope: 'app-process-hey-octo-do-task-add-project',
						context: 'teams',
						valueDefault: []
					});

					const project = entityos.get(
					{
						scope: 'app-process-hey-octo-do-task-add-project',
						context: 'project'
					});

					if (project.contactperson != undefined)
					{
						let team =
						{
							contactperson: project.contactperson
						}

						if (_.has(settings, 'selfdriven.projects.roles.default'))
						{
							team.projectrole = settings.selfdriven.projects.roles.default;
						}

						teams.push(team)
					}

					entityos.set(
					{
						scope: 'app-process-hey-octo-do-task-add-project',
						context: 'teams',
						value: teams
					});

					entityos.set(
					{
						scope: 'app-process-hey-octo-do-task-add-project',
						context: 'team-index',
						value: 0
					});

					entityos.invoke('app-process-hey-octo-do-task-add-project-process-team-save', param)
				}
			});

			entityos.add(
			{
				name: 'app-process-hey-octo-do-task-add-project-process-team-save',
				code: function (param, response)
				{
					const teams = entityos.get(
					{
						scope: 'app-process-hey-octo-do-task-add-project',
						context: 'teams',
						valueDefault: []
					});



					//add student / contactperson

					const teamIndex = entityos.get(
					{
						scope: 'app-process-hey-octo-do-task-add-project',
						context: 'team-index'
					});

					if (teamIndex == teams.length)
					{
						entityos.invoke('app-process-hey-octo-do-task-add-project-response',
						{
							response: {team: {count: teams.length}}
						});
					}
					else
					{
						const team = teams[teamIndex];

						const project =	entityos.get(
						{
							scope: 'app-process-hey-octo-do-task-add-project',
							context: 'project'
						});

						entityos.cloud.save(
						{
							object: 'project_team',
							data:
							{
								contactperson: team.contactperson,
								projectrole: team.projectrole,
								project: project.id,
							},
							callback: 'app-process-hey-octo-do-task-add-project-process-team-next'
						});
					}
				}
			});

			entityos.add(
			{
				name: 'app-process-hey-octo-do-task-add-project-process-team-next',
				code: function (param, response)
				{
					const teamIndex = entityos.get(
					{
						scope: 'app-process-hey-octo-do-task-add-project',
						context: 'team-index'
					});

					entityos.set(
					{
						scope: 'app-process-hey-octo-do-task-add-project',
						context: 'team-index',
						value: (teamIndex + 1)
					});

					entityos.invoke('app-process-hey-octo-do-task-add-project-process-team-save')
				}
			});

			entityos.add(
			{
				name: 'app-process-hey-octo-do-task-add-project-response',
				code: function (param)
				{
					const projectData = entityos.get(
					{
						scope: 'app-process-hey-octo-do-task-add-project'
					});

					var responseData =
					{
						method: 'hey-octo',
						status: 'OK',
						data: _.merge(_.get(param, 'response', {}), {project: {id: projectData.project.id}})
					}

					entityos.invoke('util-end', responseData, '200');
				}
			});

				entityos.add(
			{
				name: 'app-process-hey-octo-protect-data-encrypt',
				code: function ()
				{
					var request = entityos.get(
					{
						scope: '_request'
					});

					var data = request.body.data;

					if (data == undefined)
					{
						entityos.invoke('util-end', 
						{
							error: 'Missing data.'
						},
						'403');
					}
					else
					{
						const settings = entityos.get({scope: '_settings'});
						var dataToEncrypt = _.get(data, 'encrypt')

						if (dataToEncrypt == undefined)
						{
							entityos.invoke('util-end', 
							{
								error: 'No data to encrypt [encrypt].'
							},
							'403');
						}
						else
						{
							const encryptionService = _.get(data, 'service', 'default');

							if (encryptionService == 'default')
							{
								const keys = _.get(settings, 'protect.keys');
								const keyHash = _.get(event, 'keyhash'); //hash of the sha256/base58 "key";

								let _key;

								if (keyHash == undefined)
								{
									_key = _.find(keys, function (key)
									{
										return key.default
									});

									if (_key != undefined)
									{
										_key.keyHash = entityosProtect.hash({text: _key.key, output: 'base58'}).textHashed;
									}
								}
								else
								{
									_key = _.find(keys, function (key)
									{
										return key.keyhash == keyHash;
									});
								}

								if (_key == undefined)
								{
									entityos.invoke('util-end',
									{
										method: 'hey-octo-protect-data-encrypt',
										status: 'ER',
										data: {error: 'Key not found'}
									},
									'401');
								}
								else
								{
									if (_.isString(dataToEncrypt))
									{
										dataToEncypt = [dataToEncrypt]
									}

									console.log(dataToEncrypt);

									let dataToEncryptProcessed = [];

									_.each(dataToEncrypt, function (_dataToEncrypt)
									{
										if (_.isString(_dataToEncrypt))
										{
											dataToEncryptProcessed.push(
											{
												data: _dataToEncrypt,
												encrypted: 	entityosProtect.encrypt(
												{
													text: _dataToEncrypt,
													key: _key.key,
													iv: _key.iv
												}).textEncrypted
											})
										}
										else
										{
											_dataToEncrypt.encrypted = entityosProtect.encrypt(
											{
												text: _dataToEncrypt.data,
												key: _key.key,
												iv: _key.iv
											}).textEncrypted;

											dataToEncryptProcessed.push(_dataToEncrypt);
										}
									});
							
									if (_key.id == undefined)
									{
										_key.id = _.truncate(_key.keyhash, {length: 6});
									}

									var responseData =
									{
										"encrypted": dataToEncryptProcessed,
										"keyhash": _key.keyHash,
										"keyid": _key.id
									}

									entityos.invoke('util-end',
									{
										method: 'hey-octo-protect-data-encrypt',
										status: 'OK',
										data: responseData
									},
									'200');
								}
							}
						}
					}
				}
			});

			entityos.add(
			{
				name: 'app-process-hey-octo-protect-data-decrypt',
				code: function ()
				{
					var request = entityos.get(
					{
						scope: '_request'
					});

					var data = request.body.data;

					if (data == undefined)
					{
						entityos.invoke('util-end', 
						{
							error: 'Missing data.'
						},
						'403');
					}
					else
					{
						const settings = entityos.get({scope: '_settings'});
						var dataToDecrypt = _.get(data, 'decrypt')

						if (dataToDecrypt == undefined)
						{
							entityos.invoke('util-end', 
							{
								error: 'No data to encrypt [decrypt].'
							},
							'403');
						}
						else
						{
							const encryptionService = _.get(data, 'service', 'default');

							if (encryptionService == 'default')
							{
								const keys = _.get(settings, 'protect.keys');
								const keyHash = _.get(event, 'keyhash'); //hash of the sha256/base58 "key";

								let _key;

								if (keyHash == undefined)
								{
									_key = _.find(keys, function (key)
									{
										return key.default
									});

									if (_key != undefined)
									{
										_key.keyHash = entityosProtect.hash({text: _key.key, output: 'base58'}).textHashed;
									}
								}
								else
								{
									_key = _.find(keys, function (key)
									{
										return key.keyhash == keyHash;
									});
								}

								if (_key == undefined)
								{
									entityos.invoke('util-end',
									{
										method: 'hey-octo-protect-data-decrypt',
										status: 'ER',
										data: {error: 'Key not found'}
									},
									'401');
								}
								else
								{
									if (_.isString(dataToDecrypt))
									{
										dataToDecrypt = [dataToDecrypt]
									}

									console.log(dataToDecrypt);

									let dataToDecryptProcessed = [];

									_.each(dataToDecrypt, function (_dataToDecrypt)
									{
										if (_.isString(_dataToDecrypt))
										{
											dataToDecryptProcessed.push(
											{
												encrypted: _dataToDecrypt,
												data: entityosProtect.decrypt(
												{
													text: _dataToDecrypt,
													key: _key.key,
													iv: _key.iv
												}).textDecrypted
											})
										}
										else
										{
											_dataToDecrypt.data = entityosProtect.decrypt(
											{
												text: _dataToDecrypt.encrypted,
												key: _key.key,
												iv: _key.iv
											}).textDecrypted;

											dataToDecryptProcessed.push(_dataToDecrypt);
										}
									});
							
									if (_key.id == undefined)
									{
										_key.id = _.truncate(_key.keyhash, {length: 6});
									}

									var responseData =
									{
										"encrypted": dataToDecryptProcessed,
										"keyhash": _key.keyHash,
										"keyid": _key.id
									}

									entityos.invoke('util-end',
									{
										method: 'hey-octo-protect-data-decrypt',
										status: 'OK',
										data: responseData
									},
									'200');
								}
							}
						}
					}
				}
			});

			// UTIL FUNCTIONS ------------------------------------------

			entityos.add(
			{
				name: 'util-generate-random-text',
				code: function (param)
				{
					let length = _.get(param, 'length', 16);
					let charset = _.get(param, 'charset', 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789');
					let specialChars = _.get(param, 'specialChars', false);

					const crypto = require('crypto');

					if (specialChars)
					{
						charset += '!@#$%^&*()_+~`|}{[]:;?><,./-=';
					}
			
					const values = crypto.randomBytes(length);
					let generatedText = '';

					for (let i = 0; i < length; i++) {
						generatedText += charset[values[i] % charset.length];
					}

					return generatedText;
				}
			});

			// UTIL - CHECK CONVERSATION IS VALID

			entityos.add(
			{
				name: 'util-conversation-check',
				code: function ()
				{
					//Verify that the user making the API request has access to the conversation and is thus user they say they are1
					//Do this via messaging_conversation
					//Requestor has to be the owner of the conversation.
					//Octo is a participant
					//AuthKey == Conversation GUID

					//request.userkey - for account.
					//request.conversationkey

					var request = entityos.get(
					{
						scope: '_request'
					});

					var data = request.body.data;

					if (data == undefined)
					{
						data = {}
					}

					const keys = 
					{
						user: data.userkey,
						conversation: data.conversationkey
					}

					if (keys.user == undefined || keys.conversation == undefined)
					{
						entityos.invoke('util-end', {error: 'Missing User &/or Conversation Key'}, '401');
					}
					else
					{
						//This will prove both keys.
						//Have to do double pass as no subsearch to owner user GUID.

						entityos.cloud.search(
						{
							object: 'messaging_conversation',
							fields: [{name: 'owner'}],
							filters:
							[
								{
									field: 'guid',
									comparison: 'EQUAL_TO',
									value: keys.conversation
								},
								{
									field: 'sharing',
									comparison: 'EQUAL_TO',
									value: 1
								}
							],
							callback: 'util-conversation-check-response'
						});
					}
				}
			});

			entityos.add(
			{
				name: 'util-conversation-check-response',
				code: function (param, response)
				{
					var request = entityos.get(
					{
						scope: '_request'
					});

					var data = request.body.data;

					const keys = 
					{
						user: data.userkey,
						conversation: data.conversationkey
					}

					if (response.data.rows.length == 0)
					{
						entityos.invoke('util-end', {error: 'Bad Conversation Key'}, '401');
					}
					else
					{
						const conversation = _.first(response.data.rows);

						entityos.cloud.search(
						{
							object: 'setup_user',
							fields: [{name: 'createddate'}],
							filters:
							[
								{
									field: 'guid',
									comparison: 'EQUAL_TO',
									value: keys.user
								},
								{
									field: 'id',
									comparison: 'EQUAL_TO',
									value: conversation.owner
								}
							],
							callback: 'util-conversation-check-user-response'
						});
					}
				}
			});

			entityos.add(
			{
				name: 'util-conversation-check-user-response',
				code: function (param, response)
				{
					if (response.data.rows.length == 0)
					{
						entityos.invoke('util-end', {error: 'Bad User Key (Not The Conversation Owner)'}, '401');
					}
					else
					{
						const request = entityos.get({scope: '_request'});
						let event = entityos.get({scope: '_event'});
						event._user = _.first(response.data.rows);
						entityos.set({scope: '_event', value: event});
						entityos.invoke('app-process-' + request.body.method);
					}
				}
			});
				
			// !!!! APP STARTS HERE; Initialise the app; app-init invokes app-start if authentication OK
			entityos.invoke('app-init');
		}		
   });

  	return promise
}