import {inject} from "aurelia-dependency-injection";
import {helper} from "../helpers/helper";
import {http} from "../helpers/http";
import {Data} from "../data/go/data";


class Page{
  constructor(name, path){
    this.name = name;
    this.path = path;
    this.selected = false;
  }
}


@inject(helper, http, Data)
export class Admin {

  data=null;

  selectedPage=null;
  //dialogController;

  pages=[];

  home=null;


  constructor(helper, http, Data) {
    this.helper = helper;
    this.http = http;
    this.goData = Data;
  }

  activate(model){
    this.home = model;
  }

  close(){
    //save admin...
    this.goData.putWithUrlAndData('admin', this.data, function(res){

    });
    this.home.adminVisible = false;
  }

  tabClicked(tab){
    this.selectedPage = tab;
    for(let i = 0; i < this.pages.length; i++){
      let aPage = this.pages[i];
      if(aPage.name == tab.name){
        aPage.selected = true;
      }else{
        aPage.selected = false;
      }
    }
  }

  attached(){
    let self = this;
    self.goData.getAdmin(function(res){
      self.data = res;
    });

    //setup pages...
    let fileMaint = new Page('File Maintenance', './pages/fileMaintenance');
    fileMaint.selected = true;
    self.pages.push(fileMaint);
    self.selectedPage = self.pages[0];

    let picklist = new Page('List Management', './pages/listManagement');
    self.pages.push(picklist);

    let misc = new Page('Miscellaneous', './pages/misc');
    self.pages.push(misc);

    let db = new Page('Db Maint', './pages/dbMaintenance');
    self.pages.push(db);

    let users = new Page('Users', './pages/users');
    self.pages.push(users);

    let roles = new Page('Roles', './pages/roles');
    self.pages.push(roles);

    let groups = new Page('Groups', './pages/groups');
    self.pages.push(groups);

    let cpt = new Page('Cpt Maint', './pages/cptMaint');
    self.pages.push(cpt);

    // let toolbar = new Page('Toolbar', './pages/toolbar');
    // self.pages.push(toolbar);

    var res = $(self.adm).closest('ux-dialog-container');
    var uxDx = res[0];
    if(uxDx){
      uxDx.style.setProperty("z-index", "5000", "important");
    }
  }
}
