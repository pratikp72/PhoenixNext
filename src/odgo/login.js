
import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';

@inject(DialogController, http, helper)
export class Login {

	// userName='montymccune';
	// password='Ph0enix0rth0';
  userName='';//chang
	password='';


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
		self.http.loginOdgo(self.helper.getApiUrl("login/odgo"), {Username: self.userName, Password: self.password}, (data) => {
      if(data != "User not found."){
        self.dialogController.close(true, data);
      }else{
        alert("Incorrect Password");
      }

		}, () => {
			console.log('ERROR GETTING JWT');
		});
	}

	activate(model){
		let self = this;
		console.log('LOGIN ACTIVATE', model);
	}

  attached(){
    var res = $(this.gologin).closest('ux-dialog-container');
    var uxDx = res[0];
    uxDx.style.setProperty("z-index", "5001", "important");
    var style={
      'z-index': 5001
    }
    // style['background-color']='white';
    // style['opacity']=1;
    $('ux-dialog-overlay').css(style);
  }

}
