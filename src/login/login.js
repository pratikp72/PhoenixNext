
//import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';
import {Router} from 'aurelia-router';

@inject(http, helper, Router)
export class Login {


  // userName ='pmccune@phoenixortho.net';
	// password='012153';
  userName;
	password;//changed
	loginFailed = false;
	loginPath = 'go/home';
  httpConfigComplete = false;
  configInterval = null;

	constructor(http, helper, Router){
		this.message = "test login message";
		//this.dialogController = DialogController;
		this.http = http;
		this.helper = helper;
		this.router = Router;
	}


	loginClicked(){

		let self = this;
		let fullUrl = self.helper.getApiUrl('login');

		if(self.userName === undefined ||
    self.password === undefined){
      return;
    }

    var n = self.helper.createNoty("loading users...", 10000);
    n.show();

		self.http.login(fullUrl, {Username: self.userName, Password: self.password}, (jwt) => {

      if(jwt=="User not found."){

        self.loginFailed = true;
        //login error
        //alert("Incorrect Username or Password");

        self.helper.notyError(n, "Incorrect Username or Password");
        n.close();

      }else{

        self.helper.notySuccess(n, "Login Success");
        n.close();

        self.helper.processToken(jwt, function(res){

        });
        //navigation???
        var url = "#/" + this.loginPath + "?jwt="+ self.helper.jwt();
        self.router.navigate(url);
      }

		}, () => {
			console.log('ERROR GETTING JWT');

			alert("Login failed");

			self.helper.notyError(n, "Error Retrieving Token");
      n.close();

		});
	}

	activate(model){
		let self = this;
    self.configInterval = setInterval(function(){

      if(self.helper._server != null && self.helper._server.length > 0){
        self.httpConfigComplete = true;
        clearInterval(self.configInterval)
      }

    }, 1000);

	}

  forgotPasswordClick(){
    this.router.navigate('forgotpassword');
  }

}
