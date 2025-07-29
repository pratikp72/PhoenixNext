
import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';

@inject(DialogController)
export class Error {

	constructor(DialogController){
		this.message = "test login message";
		this.dialogController = DialogController;
	}

	okClicked(){
		let self = this;
        self.dialogController.close(true, null);
	}

	activate(message){
		let self = this;
		self.message = message;
		console.log('LOGIN ACTIVATE', message);
	}

}
