import {inject} from "aurelia-dependency-injection";
import {helper} from "../../helpers/helper";
import {http} from "../../helpers/http";
import {Data} from "../../data/go/data";
import * as _ from 'lodash';
import {PopupHelper} from "../../go/popupHelper";

class Area {
  constructor(name, selected){
    this.name= name;
    this.selected = selected;
  }
}

class Role{
  constructor(name, data){
    this.name = name;
    this.selectable = false;
    this.areas=[];
    this.data = data;
  }
}



@inject(helper, http, Data, PopupHelper)
export class Roles {

  roles=[];
  areas=[];

  height;
  selectedRole=null;

  enableEdit = false;

  constructor(helper, http, Data, PopupHelper) {
    this.helper = helper;
    this.http = http;
    this.goData = Data;
    this.popupHelper = PopupHelper;
  }

  activate(obj) {
    let self = this;
    self.data = obj.data;
    self.setup();
  }

  setup(){
    let self = this;

    self.height = window.innerHeight - 60;

    let roleObj = self.getRoleObject();
    let areaKeys = Object.keys(roleObj);
    for(let i = 0; i < areaKeys.length; i++){
      self.areas.push(new Area(areaKeys[i], false));
    }

    self.goData.getWithUrl('roles', function(res){
      for(let p = 0; p < res.length; p++){
        self.addRole(res[p]);
      }
    });
  }

  addRole(role){
    let self = this;
    if(role.Json != null){
      let newRole = new Role(role.RoleName, role);
      let listObj = JSON.parse(role.Json);
      let keys = Object.keys(listObj);
      let vals = Object.values(listObj);

      for(let i = 0; i < keys.length; i++){

        let selected = 0;
        if(vals[i] != null && vals[i] != ''){
          selected = vals[i];
        }
        let aArea = new Area(keys[i], selected);
        newRole.areas.push(aArea);
      }

      this.roles.push(newRole);
    }else{

      let tRole = new Role(role.RoleName, role);

      let tkeys = Object.keys(role);
      let tvals = Object.values(role);
      for(let i = 0; i < tkeys.length; i++){
        let aKey = tkeys[i];
        if(aKey != 'RoleID' && aKey != 'RoleName' && aKey != 'Json' && aKey != 'OD_Users'){
          let selected = 0;
          if(tvals[i] != null && tvals[i] != ''){
            selected = tvals[i];
          }
          let aArea = new Area(aKey, selected);
          tRole.areas.push(aArea);
        }
      }

      this.roles.push(tRole);
    }
  }

  getRoleObject(){
    return JSON.parse('{"AdminAccess":false,"VisitManagement":false,"Clinical":true,"RX":false,"PatientDemographics":true,"DocumentGeneration":false,"FileMaintenance":false,"Location":false,"DocumentView":true,"DocumentModify":true,"DocumentEditor":false,"ImagingAdd":true,"ImagingModify":true,"ImagingAdmin":true,"PatientAlerts":false,"DeleteHistory":false,"PatientPrivacyAccess":false,"ViewAllUserTasks":false,"DeleteTasks":false}');
  }

  roleClick(role){
    let self = this;
    self.selectedRole = role;
    self.enableEdit = true;
    for(let g = 0; g < self.roles.length; g++){
      if(self.roles[g].name == role.name){
        self.roles[g].selected = true;
      }else{
        self.roles[g].selected = false;
      }
    }
  }

  addArea(a){
    let self = this;
    if(self.selectedRole){
      for(let g = 0; g < self.selectedRole.areas.length; g++){
        let aArea = self.selectedRole.areas[g];
        if(aArea.name == a.name){
          return;
        }
      }
      self.selectedRole.areas.push(a);
    }
  }

  deleteArea(a){
    let self = this;
    if(self.selectedRole){
      for(let g = 0; g < self.selectedRole.areas.length; g++){
        let aArea = self.selectedRole.areas[g];
        if(aArea.name == a.name){
          self.selectedRole.areas.splice(g, 1);
        }
      }
    }
  }

  update(){
    let self = this;
    if(self.selectedRole){
      self.updateSelectedRoleWithAreas();
    }
  }

  newRoleClick() {
    let self = this;
    self.popupHelper.openGenericInputPop('Role Name', ['New Role'],null, false, function (res) {
      let aRole = new Role(res.value, null);
      self.roles.push(aRole);
      self.roleClick(aRole);

    });
  }


}
