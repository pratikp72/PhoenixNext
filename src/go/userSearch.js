/**
 * Created by montymccune on 7/26/19.
 */

import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';
import * as _ from 'lodash';


class User{
  constructor(id, name, data){
    this.id = id;
    this.name = name;
    this.selected = false;
    this.data = data;
  }
}


@inject(DialogController, http, helper)
export class UserSearch {


  selectedUser=null;
  searchResults=[];

  searchString="";
  users=[];

  popupLR = 0;
  popupTB = 0;
  popupWidth = 0;
  popupHeight = 0;


  constructor(DialogController, http, helper){
    this.dialogController = DialogController;
    this.http = http;
    this.helper = helper;
  }

  searchStringResult(val){
    this.searchString = val;
    this.filter();
  }

  searchStringResult(){
    return this.searchString;
  }

  close(){
    let self = this;
    self.dialogController.close(true, self.selectedUser);
  }

  cancel(){
    let self = this;
    self.dialogController.cancel();//true, self.selectedUser);
  }

  attached(){
    var res = $(this.userdialog).closest('ux-dialog-container');
    var uxDx = res[0];
    uxDx.style.setProperty("z-index", "5001", "important");
  }

  activate(obj){
    let self = this;
    //self.taskDialog = obj.taskpop;
    self.popupWidth = obj.options.popupWidth;// * .5;
    self.popupHeight = obj.options.popupHeight;
    self.popupTop = obj.options.popupTop;// (obj.popupHeight - self.popupHeight) / 2;
    self.popupLeft = obj.options.popupLeft;// obj.offsetLeft;// + obj.taskpop.offsetWidth - self.popupWidth;

    self.dialogController.settings.host = obj.host;

    self.getUsers();
  }

  getUsers(){
    var self = this;

    var n = self.helper.createNoty("loading users...", 10000);
    n.show();

    self.http.get(self.helper.getApiUrl('users'), function (res) {
      self.users = _.filter(res, function(o) { return o.LastName != null && o.LastName.trim().length > 0});

      self.helper.notySuccess(n, "users loaded");
      n.close();
    });
  }

  filter(val){
    var self = this;
    self.searchResults = [];

    var res = _.filter(self.users, function(o) { return o.LastName.toLowerCase().startsWith(self.searchString.toLowerCase()) || o.FirstName.toLowerCase().startsWith(self.searchString.toLowerCase())  });
    var startsWith = _.filter(res, function(o) { return o.LastName.toLowerCase().startsWith(self.searchString.toLowerCase()) });
    var notStartWith = _.filter(res, function(o) { return !o.LastName.toLowerCase().startsWith(self.searchString.toLowerCase()) });

    startsWith = _.sortBy(startsWith, [ function(o){ return o.LastName; }]);
    notStartWith = _.sortBy(notStartWith, [ function(o){ return o.LastName; }]);

    for(var i = 0; i < startsWith.length; i++){
      var aUser = startsWith[i];
      self.searchResults.push(new User(aUser.UserID, aUser.LastName + ", " + aUser.FirstName, aUser));
    }
    for(var i = 0; i < notStartWith.length; i++){
      var aUser = notStartWith[i];
      self.searchResults.push(new User(aUser.UserID, aUser.LastName + ", " + aUser.FirstName, aUser));
    }

  }

  rowClicked(r){
    var self = this;
    for(var i = 0; i < self.searchResults.length; i++){
      var row = self.searchResults[i];
      if(row.id == r.id){
        row.selected = true;
        self.selectedUser = r;
      }else{
        row.selected = false;
      }
    }
  }



}
