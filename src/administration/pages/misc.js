import {inject} from "aurelia-dependency-injection";
import {observable} from 'aurelia-framework';
import {helper} from "../../helpers/helper";
import {http} from "../../helpers/http";
import {Data} from "../../data/go/data";
import {PopupHelper} from "../../go/popupHelper";
import { set } from "lodash";
import { Globals } from "../../go/globals";

@inject(helper, http, Data, PopupHelper, Globals)
export class Misc {

  data=null;
  otherApps=null;
  externalapps=[];
  odgoUsers=[];
  odgoUsername=null;
  odgoPassword=null;
  halfHeight=200;

  odgoAdminUserChecked=false;
  displayOdgoAdminUserCheckbox=true;

  setup = true;

  @observable autoLogoffMinutes = 0;
  autoLogoffMinutesChanged(newVal, oldVal){
    if(!this.setup){
      this.data.AutoLogOffTimeout = this.getMinutesToSeconds(newVal);
    }
  }

  constructor(helper, http, Data, PopupHelper, Globals) {
    this.helper = helper;
    this.http = http;
    this.goData = Data;
    this.popupHelper = PopupHelper;
    this.globals = Globals;
  }

  activate(obj) {
    let self = this;
    self.data = obj.data;

    //convert autologoff from seconds to minutes...
    self.autoLogoffMinutes = self.getSecondsToMinutes(self.data.AutoLogOffTimeout);

    self.otherApps={
      docBuilder: {name: 'Document Builder', path: self.helper._webDocsServer + '#editor'},
      email: {name: 'Email Notification Manager', path: '#systemadmin/emailnotification'},
      kiosk: {name: 'Kiosk Preferences', path:'../kioskPreferences/index'},
      mapper: {name: 'Procedure Mapper', path:'../administration/procedure-mapper'},
      formBuilder : {name: 'Form builder', path: '../formbuilder/editor'},//editor
      reportBuilder : {name: 'Report builder', path: '../reportbuilder/editor'},
      odgo : {name: 'ODGO Admin', path: '../odgo/home'}//editor
    }

    self.goData.getWithUrl('externalapps/all', function(res){
      self.externalapps=res;
    });

    self.goData.getWithUrl('odgo/admin/users/all', function(users){
      self.odgoUsers=users;
      //display admin checkbox if NO users...
      // if(users.length == 0){
      //   self.displayOdgoAdminUserCheckbox = true;
      // }else{
        //check for admin...
        for(var u = 0; u < users.length; u++){
          var aUsr = users[u];
          if(self.isUserAdmin(aUsr.Token)){
            self.displayOdgoAdminUserCheckbox = false;
            break;
          }
        }
      //}
    });

    self.setup = false;
  }

  isUserAdmin(token) {
    var splitToken = token.split('.');
    var payloadString = splitToken[1];
    var payload = atob(payloadString);

    var user = JSON.parse(payload);
    if(user.Admin == 'True'){
      return true;
    }
    return false;
  }

  attached(){
    this.halfHeight = (this.mainrow.clientHeight / 2) - 68;
  }

  openPopup(name){
    let self = this;
    let obj = self.otherApps[name];
    let viewPath = obj.path;
    let popupTitle = "";
    let openWithUr=false;
    var backgroundColor = '#ffffff';
    var ignoreScrollCalc = false;
    var scrollHeight = '90vh';
    if(name == 'docBuilder' || name == 'email'){
      viewPath = viewPath.concat('?jwt='+ self.helper._jwt);
      openWithUr = true;
      // popupTitle = obj.name;
    }
    if(name === 'formBuilder' || name === 'reportBuilder'){
      popupTitle = obj.name;
      backgroundColor = '#e8e8e8';
      ignoreScrollCalc = true;
      scrollHeight = '100%';
    }
    if(name === 'kiosk'){
      ignoreScrollCalc = true;
      scrollHeight = 'auto';
    }




    // const windowHeight = window.innerHeight;
    // const windowWidth = window.innerWidth;
    const windowHeight = '100%';
    const windowWidth = '100%';

    let options={
      closeActiveDialog: false,
      width: windowWidth,
      height: windowHeight,
      top: 0,
      left:0,
      title: obj.name,
      popupHeight: windowHeight,
      backgroundColor: backgroundColor,
      ignoreScrollHeightCalculations: ignoreScrollCalc,
      scrollHeight: scrollHeight
      //contentHeight = obj.options.contentHeight;
    }

    if(openWithUr){
      this.popupHelper.openUrlPathPop(viewPath, options, function(res){

      });
    }else{
      //options.scrollHeight='90vh';//500;
      this.popupHelper.openViewModelPop(viewPath, {jwt: self.helper._jwt}, popupTitle, windowWidth, windowHeight, 0, 0, options, function(res){

      });
    }
  }

  getSecondsToMinutes(seconds){
    return seconds / 60;
  }

  getMinutesToSeconds(minutes){
    return minutes * 60;
  }

  deleteApp(r, index){
    let self = this;

    if(r.ExternalAppID == 0){
      self.removeExternalAppFromList(index);
      return;
    }

    let url = `externalapps?id=${r.ExternalAppID}`;
    self.goData.deleteWithUrl(url, function(res){
      if(res == true){
        //remove app from list...
        self.removeExternalAppFromList(index);
      }
    });
  }

  removeExternalAppFromList(index){
    let self = this;
    for(let i = 0; i < self.externalapps.length; i++){
      if(i == index){
        self.externalapps.splice(i, 1);
        break;
      }
    }
  }

  toggleExternalApp(r){
    r.Enabled = r.Enabled ? false : true;
    this.saveExternalApp(r);
  }

  saveExternalApp(r){
    let self = this;

    let saveText = `Saving External App: ${r.ExternalAppName}...`;

    var noty = self.helper.createNoty(saveText, 3000);
    noty.show();

    if(r.ExternalAppID == 0){
      self.goData.postWithUrlAndData('externalapps', JSON.stringify(r), function(res){
        r.ExternalAppID = res.ExternalAppID;
        noty.close();
      });
    }else{
      self.goData.putWithUrlAndData('externalapps', r, function(res){
        noty.close();
      });
    }
  }

  addExternalApp(){
    let self = this;
    self.goData.getWithUrl('externalapps/new', function(res){
      res.Enabled = true;
      self.externalapps.push(res);
    })
  }

  deleteODGOUser(id){
    let self = this;
    self.goData.deleteWithUrl(`odgo/admin/users?id=${id}`, function(res){
      if(res == true){
        //remove user from list...
        var indexToDelete =_.findIndex(self.odgoUsers, function(u){return u.Id == id});
        self.odgoUsers.splice(indexToDelete, 1);
      }else{
        var noty = self.helper.createNoty("User failed to delete.", 3000);
        noty.show();
      }
    })
  }

  addODGOUser(){
    let self = this;
    if(self.odgoUsername != null && self.odgoPassword != null){

      let saveText = `Saving ODGO User...`;

      var noty = self.helper.createNoty(saveText, 3000);
      noty.show();

      var odgoUser={
        'UserName': self.odgoUsername,
        'Password': self.odgoPassword,
        'Admin': true,//self.odgoAdminUserChecked,
        'TenantId': self.globals.admin.TenantId
      }
  
      self.goData.postWithUrlAndData('odgo/admin/users', JSON.stringify(odgoUser), function(user){
        if(user != null){
          self.helper.notySuccess(noty, `User: ${user.Username} created successfuly!`);
          self.odgoUsers.push(user);

          // if(self.odgoAdminUserChecked){
          //   self.displayOdgoAdminUserCheckbox = false;
          //   self.odgoAdminUserChecked = false;
          // }

        }else{
          self.helper.notyError(noty, `Failed to create user.`);
        }
      });
    }
  }



}
