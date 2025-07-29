
import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';

@inject(DialogController, http, helper)
export class Login {

	userName;
	password;
	urlPrepender;

	constructor(DialogController, http, helper){
		this.message = "test login message";
		this.dialogController = DialogController;
		this.http = http;
		this.helper = helper;
	}

	loginClicked(){
		let self = this;
		console.log('UserName', self.userName);
		console.log('Password', self.password);
		self.http.login(self.helper.getApiUrl("login"), {Username: self.userName, Password: self.password}, (data) => {
			self.dialogController.close(true, data);
		}, () => {
			console.log('ERROR GETTING JWT');
		});
	}

	activate(model){
		let self = this;
		self.urlPrepender = model.url;
		console.log('LOGIN ACTIVATE', model);
	}

}
