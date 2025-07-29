import {inject} from "aurelia-dependency-injection";
import {helper} from "../../helpers/helper";
import {http} from "../../helpers/http";
import {Data} from "../../data/go/data";
import * as _ from 'lodash';
import {PopupHelper} from "../../go/popupHelper";


class GroupAndUsers{
  constructor(data){
    this.name = data.GroupName;
    this.data = data;
    this.location = data.Location;
    this.users = data.Users;
    this.selected = false;
  }
}

class Location{
  constructor(name, data){
    this.name = name;
    this.data = data;
  }
}

@inject(helper, http, Data, PopupHelper)
export class Groups {

  groups=[];
  locations=[];

  height;
  selectedGroup=null;

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

    self.goData.getWithUrl('groups/users', function(res){
      for(let p = 0; p < res.length; p++){
        let grpUsr = res[p];
        let aGroupAndUser = new GroupAndUsers(grpUsr);
        self.groups.push(aGroupAndUser);
      }
    });

    self.goData.getWithUrl('locations', function(res){
      for(let p = 0; p < res.length; p++){
        self.locations.push(new Location(res[p].LocationName, res[p]));
      }
    });
  }

  locationMatcher(a,b){
    if(a == null || b == null)return false;

    return a.data.LocationID == b.LocationID;
  }

  locationSelected(){
    let self = this;
    let selectedLocation = self.selectedGroup.location;
  }

  addUser() {
    let self = this;
    self.popupHelper.openUserSearchPop(function (res) {
      if(res){
        self.selectedGroup.users.push(res.data);
      }
    }, null, {closeActiveDialog:false});
  }

  deleteUser(u){
    let self = this;
    if(self.selectedGroup){
      let users = self.selectedGroup.users;
      for(let g = 0; g < users.length; g++){
        let aUsr = users[g];
        if(aUsr.UserID == u.UserID){
          users.splice(g, 1);
        }
      }
    }
  }

  groupClick(group){
    let self = this;
    self.selectedGroup = group;
    self.enableEdit = true;
    for(let g = 0; g < self.groups.length; g++){
      if(self.groups[g].name == group.name){
        self.groups[g].selected = true;
      }else{
        self.groups[g].selected = false;
      }
    }
  }

  update(){
    let self = this;
    if(self.selectedGroup){

    }
  }

  newGroupClick(){
    let self = this;
    self.popupHelper.openGenericInputPop('Group Name', ['New Group'], null, false, function (res) {

      let data ={
          GroupName: res.value,
          data : null,
          Location: null,
          Users: [],
          selected: false
      }

      let grpAndUsr = new GroupAndUsers(data);
      self.groups.push(grpAndUsr);
      self.groupClick(grpAndUsr);

    });
  }

}
