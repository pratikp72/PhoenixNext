
import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {JsBridge} from '../helpers/jsBridge';
import {inject} from 'aurelia-framework';
import {BindingEngine} from 'aurelia-binding';
import $ from 'jquery';
import 'ms-signalr-client';
import * as _ from 'lodash';
import moment from 'moment';
import {DialogService} from 'aurelia-dialog';
import {Login} from '../fax/login';
import {DevicePop} from "../implantableDeviceLookup/devicePop";

@inject(helper, http, JsBridge, BindingEngine, DialogService)
export class Dashboard {

	constructor(helper, http, jsBridge, bindingEngine, dialogService){
		let self = this;
		this.helper = helper;
		this.http = http;
		this.jsBridge = jsBridge;
		this.faxes = [];
		this.totalFaxes = 0;
		this.pageSize = 200;
		this.selectedFax = null;
		this.name = '';
		this.proxy = {};
		this.jwt = '';
		// this.sourcePath = 'C:\\Users\\Tyler\\Desktop\\Faxes_6-14';
		this.sourcePath = 'C:\\Phoenix\\fax\\demo';
		this.destPath = 'C:\\Phoenix\\fax\\inbound';
		this.hasSelectedFax = false;
		this.dialogService = dialogService;
		this.headerHeight = 70;
		this.leftColumnWidth = 230;
		this.enableButtons = false;
		this.columnHeaderHeight = 40;
		this.selectedFaxSubscription = bindingEngine.propertyObserver(this, 'selectedFax')
			.subscribe((newValue, oldValue) => {
				if(newValue && newValue.Status === 'succeeded'){
					console.log('opening pdf');
					self.jsBridge.openPdf(newValue.Data);
				} else if(newValue && newValue.Status !== "succeeded"){
					console.log('closing pdf');
					self.jsBridge.closeCurrentPdf();
				}
			});
		// this.urlPrepender = 'http://192.168.1.193';
		this.urlPrepender = '';//'http://localhost';
	}

	getUrl(fragment){
		return this.urlPrepender + this.helper.getApiUrl(fragment);
	}

	sendClicked() {
		let self = this;
		self.proxy.invoke('send', self.name, self.messageText);
		self.messageText = '';
	}

	getFileName(fullPath){
		return fullPath.replace(/^.*[\\\/]/, '');
	}

	startTest() {
		let self = this;
		console.log('START TEST CLICKED!');
		// var url = self.urlPrepender + self.helper.getApiUrl('jobqueue/starttest');
		var closed = self.jsBridge.closeCurrentPdf();
		console.log('CLOSED:', closed);
		var url = self.helper.getApiUrl('jobqueue/starttest');
		self.http.get(url + '?sourcePath=' + self.sourcePath + '&destPath=' + self.destPath + '&amount=' + self.pageSize, (data) => {
			console.log('STARTED TEST', data);
			self.hasSelectedFax = false;
		}, (error) => {
			console.log('FAILED STARTING TEST', error);
			var errorObject = {Status: 'failed', Title: 'Error starting test'};
			self.faxes.push(errorObject);
		});
	}

	clearAndReset() {
		let self = this;
		// var url = self.urlPrepender + self.helper.getApiUrl('jobqueue/clearandreset');
		var closed = self.jsBridge.closeCurrentPdf();
		console.log('CLOSED:', closed);
		var url = self.getUrl('jobqueue/clearandreset');
		url = url + '?sourcePath=' + self.sourcePath;
		self.http.get(url, (data) => {
			console.log('CLEARED AND RESET', data);
		});
	}

	getFaxes(){
		let self = this;
		var url = self.getUrl('jobqueue');
		var date = moment().format('MM-DD-YYYY');
		this.http.get(url + '?pageSize=' + self.pageSize + '&pageNumber=1&date='+ date, (data) => {
			console.log('GOT FAXES', data);
			_.each(data, (returnedFax) => {
				let preExistingFax = _.find(self.faxes, (fax) => {
					return fax.Id === returnedFax.Id;
				});
				if(!preExistingFax){
					// var faxNumber = self.faxes.length + 1;
					// returnedFax.Title = 'Fax ' + faxNumber;
					var filename = returnedFax.Data.replace(/^.*[\\\/]/, '');
					returnedFax.Title = filename;
					try {
						returnedFax.JobLog = JSON.parse(returnedFax.JobLog);
					} catch(err) {
						returnedFax.JobLog = { LogMessages: [{LogStep: 1, Message: returnedFax.JobLog}] }
					}
					self.faxes.push(returnedFax);
				}
			});
			self.removeMissingFaxes(data);
			if(self.totalFaxes !== self.faxes.length){
				self.totalFaxes = self.faxes.length;
			}
			self.setSelectedFax();
			self.enableButtons = true;
		});
	}

	removeMissingFaxes(data) {
		let self = this;
		let removedFax = false;
		_.each(self.faxes, (fax) => {
			let returnedFaxFromFaxes = _.find(data, (returnedItem) => {
				return returnedItem.Id === fax.Id;
			});
			if (!returnedFaxFromFaxes) {
				var faxesLength = self.faxes.length;
				for (var i = 0; i < faxesLength; i++) {
					var currentFax = self.faxes[i];
					if(currentFax == fax){
						if(self.selectedFax == fax){
							self.hasSelectedFax = false;
						}
						self.faxes.splice(i, 1);
						removedFax = true;
						console.log('REMOVED FAX!', currentFax);
						break;
					}
				}
			}
			if(removedFax == true){
				//this exits the _.each loop
				return false;
			}
		});
		if(removedFax){
			self.removeMissingFaxes(data);
		}
	}

	faxSelected(fax){
		let self = this;
		self.selectedFax = fax;
		console.log('FAX SELECTED', fax);
		console.log('SELECTED FAX LOG', fax.JobLog);
		self.hasSelectedFax = true;
	}

    isParent(log) {
        var match = false;

        if(!log || !log.LogMessages){
            return false;
        }

        for(var i = 0; i < log.LogMessages.length; i++){
            var message = log.LogMessages[i];
            console.log('IS PARENT CHECK:', message);
            if(message.Message.search(/\bsplit into\b/i) > -1){
                console.log('PARENT FOUND');
                match = true;
                break;
            }
        }

        /*
        _.forEach(log.LogMessages, (message) => {
            console.log('IS PARENT CHECK:', message);
            if(message.Message.search(/\bsplit into\b/i) > -1){
                console.log('PARENT FOUND');
                match = true;
                return false;
            }
        });
        */

        return match;
    }

	isChild(log) {
	    var match = false;

	    if(!log || !log.LogMessages){
	    	return false;
		}

		for(var i = 0; i < log.LogMessages.length; i++){
	        var message = log.LogMessages[i];
            if(message.Message.search(/\bsplit from\b/i) > -1){
                console.log('CHILD FOUND');
                match = true;
                break;
            }
		}
		/*
		_.forEach(log.LogMessages, (message) => {
			console.log('IS CHILD CHECK:', message);
			if(message.Message.search(/\bsplit from\b/i) > -1){
                console.log('CHILD FOUND');
				match = true;
				return false;
			}
		});
		*/

		return match;
	}

	setSelectedCardStyle(fax){
		let self = this;
		var styles = '';
		var status = fax.Status;
		var confidence = fax.Confidence;
		//BlueViolet - parent
		//MediumPurple - child

		if(self.isParent(fax.JobLog)){
			return 'text-parent';
		}

        if(self.isChild(fax.JobLog)){
            return 'text-child';
        }

		switch (status) {
			case 'succeeded':
				console.log('CONFIDENCE', confidence);
				switch(confidence){
					case 'High':
						styles = 'border-success text-success';
						break;
					case 'Medium':
						styles = 'border-warning text-warning';
						break;
					case 'Low':
						styles = 'border-secondary text-secondary';
						break;
					default:
						styles = 'border-danger text-danger';
						break;
				}
				break;
			case 'failed':
				styles = 'border-danger text-danger';
				break;
			default:
				styles = 'border-primary text-primary';
				break;
		}
		return styles;
	}

	setCardStyle(fax){
	    let self = this;
		var styles = '';
		var status = fax.Status;
		var confidence = fax.Confidence;

        if(self.isParent(fax.JobLog)){
            return 'fax-parent';
        }

        if(self.isChild(fax.JobLog)){
            return 'fax-child';
        }

		switch (status) {
			case 'succeeded':
				console.log('CONFIDENCE', confidence);
				styles = 'text-white '
				switch(confidence){
					case 'High':
						styles = styles + 'bg-success';
						break;
					case 'Medium':
						styles = styles + 'bg-warning';
						break;
					case 'Low':
						styles = styles + 'bg-secondary';
						break;
					default:
						styles = styles + 'bg-danger';
						break;
				}
				break;
			case 'failed':
				styles = 'text-white bg-danger';
				break;
			case 'processing':
				styles = 'text-white bg-primary';
				break;
			default:
				styles = 'border-secondary text-secondary';
				break;
		}
		return styles;
	}

	setSelectedFax() {
		let self = this;
		if(!self.hasSelectedFax){
			let processingFax = _.find(self.faxes, (fax) => {
				return fax.Status == 'processing';
			});
			if(!processingFax && self.faxes.length > 0){
				processingFax = self.faxes[self.faxes.length - 1];
			}
			self.selectedFax = processingFax;
		}
	}

	attached(){
		let self = this;
		console.log('THE DASHBOARD!!!');
		self.dialogService.open({viewModel: Login, model: {url: self.urlPrepender}}).whenClosed(response => {
			console.log('DIALOG RETURN VALUE:', response);
			self.getFaxes();
		});
	}

  setupSignalR(){
    let self = this;
    var connectionUrl = self.getUrl('');
		connectionUrl = connectionUrl.substr(0, connectionUrl.length - 1);
		console.log('ABOUT TO CONNECT TO SIGNAL R:', connectionUrl);
		var connection = $.hubConnection(connectionUrl);
		self.proxy = connection.createHubProxy('faxLoggerHub');
		self.proxy.on('totalFaxes', (total) => {
			// compare the total to the amount already up here, taking the page into account
			// if the current page is having faxes added, go get them
			console.log('TOTAL FAXES', total);
			console.log('PREVIOUS TOTAL', self.totalFaxes);
			if(total !== self.totalFaxes){
				self.getFaxes();
			}
			if(total === 0){
				self.faxes.splice(0);
				self.selectedFax = null;
				// self.log = [];
				self.hasSelectedFax = false;
			}
		});
		self.proxy.on('statusChange', (changes) => {
			//changes is an array
			//find the fax that matches the id and update it's status
			_.forEach(self.faxes, (fax) => {
				let change = _.find(changes, (changeObject) => {
					return changeObject.Id === fax.Id;
				});
				if(change){
					_.forEach(fax, (value, key) => {
						var newValue = change[key];
						if(key === 'JobLog'){
							try{
								newValue = JSON.parse(change[key]);
							} catch (err) {
								newValue = { LogMessages: [{LogStep: 1, Message: change[key]}] }
							}
						}
						if(newValue){
							fax[key] = newValue;
						}
					});
				}
			});
			self.setSelectedFax();
		});
		self.proxy.on('broadcastProcessingLog', (log) => {
			console.log(log);
			/*
			if(self.selectedFax === null || log.Id === self.selectedFax){
				console.log('RECEIVED PROCESSING LOG', log);
				self.log = log;
			}
			*/
			let faxForLog = _.find(self.faxes, (fax) => {
				return fax.Id === log.Id;
			});
			if(faxForLog){
				faxForLog.JobLog = log;
			}
		});
		connection.start({jsonp: true})
			.done(() => {
				console.log('CONNECTED!');
			})
			.fail((error) => { console.log('ERROR CONNECTING', error); });
  }

	activate(){
		let self = this;
    //self.setupSignalR();
	}

	deactivate(){
		this.selectedFaxSubscription.dispose();
	}

}
