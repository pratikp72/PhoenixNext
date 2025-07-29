import {helper} from '../../helpers/helper';
import {http} from '../../helpers/http';
import {inject, bindable, BindingEngine} from 'aurelia-framework';
import moment from "moment";
import {Home} from '../home';
import {Data} from '../../data/go/data';
import {PxSearch} from "../pxSearch";
import {DialogService} from 'aurelia-dialog';
import * as _ from 'lodash';
import {PopupHelper} from "../popupHelper";
import {EventAggregator} from 'aurelia-event-aggregator';
import { Globals } from '../globals';


@inject(helper,http,Home, Data, DialogService, PopupHelper, BindingEngine, EventAggregator, Globals)
export class Order {

  orders=[];
  patientId;
  date;
  providerId;
  userId;
  bodypart;
  bodyside;
  board = null;
  xrays=[];
  displayDeleteHeader=false;
  locked = false;
  ordersObserver=null;

  block=null;

  prefs=[];
  prefTypes=[];

  pxObject=null;

  loading = true;
  isAddingPreference=false;

  constructor(helper, http, Home, Data, DialogService, PopupHelper, BindingEngine, EventAggregator, Globals){
    this.helper = helper;
    this.http = http;
    this.home = Home;
    this.goData = Data;
    this.dialogService = DialogService;
    this.popupHelper = PopupHelper;
    this.bindingEngine = BindingEngine;
    this.eventAggregator = EventAggregator;
    this.globals = Globals;

    // let subscription = BindingEngine.collectionObserver(this.orders)
    //   .subscribe(this.ordersChanged.bind(this));
  }

  ordersChanged(splices) {
    var self = this;
    //if we are loading the card and NOT adding a preference, don't save...
    if(self.loading && !self.isAddingPreference){
      return;
    }
    // This will fire any time the collection is modified.
      this.save();

      //reset...
      self.isAddingPreference = false;
  }

  activate(model){
    this.block = model;
    this.block.childModel = this;
  }

  addPreferenceWithId(labId){
    let self = this;
    self.isAddingPreference = true;
    // let url = `laborder/pref?id=${labId}`;
    let url = `procedures/${labId}`;
    self.goData.getWithUrl(url, function(res){
      if(res){
      // if(res && res.OD_Procedures){
        // let px = res.OD_Procedures;
        // var aOrder = self.goData.getNewPx(0, px.CptKey, px.Description, null, px);
        var aOrder = self.goData.getNewPx(0, res.CptKey, res.Description, null, res);
        self.tryAddWithExistanceCheck(aOrder);
      }
    });
  }

  attached(){

    var self = this;
    self.loading = true;

    self.displayDeleteHeader = !self.globals.isTouchDevice ? true : false;

    if(self.home.currentBoard != null &&
      self.home.currentBoard.patientId != null){

      self.board = self.home.currentBoard;

      self.patientId = self.home.currentBoard.patientId;
      self.date = self.home.currentBoard.visitInfo.date;
      self.providerId= self.home.currentBoard.visitInfo.providerId;
      self.userId = self.home.currentBoard.userId;
      self.bodypart = self.home.currentBoard.visitInfo.bodypart;
      self.bodyside = self.home.currentBoard.visitInfo.bodyside;
      self.locked = self.home.currentBoard.visitInfo.locked == 0 ? false : true;

      self.goData.getWithUrl('procedure', function(res){
        self.pxObject = res;
      });

      self.getPrefs(self.providerId);

      self.load(function(){
        if(self.ordersObserver==null){
          self.ordersObserver = self.bindingEngine.collectionObserver(self.orders)
            .subscribe(self.ordersChanged.bind(self));

          setTimeout(function(){
            self.loading = false;
          },1000);
        }
      });

      self.eventAggregator.subscribe("refreshOrders", function(){
        self.load();
      });

      if(self.block.loadPreferenceCallback){
        self.block.loadPreferenceCallback(self.block);
      }

      // if(self.ordersObserver==null){
      //   self.ordersObserver = self.bindingEngine.collectionObserver(self.orders)
      //     .subscribe(self.ordersChanged.bind(self));
      // }

    }
  }

  doesOrderExist(order){
    return _.find(this.orders, function(o){return o.code == order.code && o.side == order.side });
  }

  displayPxSearch(filterType){
    let self = this;

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    // if(self.ordersObserver==null){
    //   self.ordersObserver = self.bindingEngine.collectionObserver(self.orders)
    //     .subscribe(self.ordersChanged.bind(self));
    // }


    self.popupHelper.openProcedureSearchPop(filterType, false, function(pxs){
      if(pxs != null){
        for(let p = 0; p < pxs.length; p++){
          self.tryAddWithExistanceCheck(pxs[p]);
        }
      }
    });

  }

  openLabEditPopup(px){
    let self = this;
    //open popup
    let viewPath = './labOrderEdit';
    const windowHeight = window.innerHeight - 100;
    const windowWidth = window.innerWidth;

    let width = (windowWidth / 3) * 2;
    let left = (windowWidth / 5);

    let options={
      closeActiveDialog: false
    }

    // let model={
    //   "user": user,
    //   "licenses": licenseList
    // }

    let title = "Lab Order";

    self.popupHelper.openViewModelPop(viewPath, px, title, width, windowHeight, 50, left, options, function(obj, res){
      if(obj.hasOwnProperty("cancelled")){
        return;
      }else{
        px = res.output;
        self.save();
      }
    });
  }

  OD_Lab_LOINCToOD_Lab_Order(loinc){
    var order = this.getNewLabOrder(this.patientId, this.providerId, this.date, this.userId);
    order.TestOrdered = loinc.Short_Name;
    order.Type="Lab";
    order.Code = loinc.LCODE;
    return order;
  }

  tryAddWithExistanceCheck(obj){
    let self = this;
    if(!self.doesOrderExist(obj)){
      //add search result to list...
      var aOrder = self.goData.getNewPx(0, obj.code, obj.description ,moment().format("MM/DD/YYYY"), obj.data);
      aOrder.side = obj.side;
      aOrder.part = obj.part;
      aOrder.index = self.orders.length;
      aOrder.canDelete = true;

      if(obj.data.hasOwnProperty("LNAMEID")){
        aOrder.type = "LAB";

        //convert OD_Lab_LOINC to OD_Lab_Order...
        aOrder.data = self.OD_Lab_LOINCToOD_Lab_Order(obj.data);

      }else if(obj.data.hasOwnProperty("Type")){
        aOrder.type = obj.data.Type;
        if(aOrder.type.toUpperCase() == "X-RAY" || aOrder.type.toUpperCase() == "XRAY"){
          aOrder.outside = false;
        }
      }


      self.orders.push(aOrder);
    }else{
      //display alert...
      self.displayAlert(`${obj.code} ${obj.description} already exists today!`, 'Order Exists', ['OK']);
    }
  }

  displayAlert(text, header, buttonDescriptionArray, callback) {
    let self = this;
    self.popupHelper.openGenericMessagePop(text, header, buttonDescriptionArray, false, function(res){
      if(callback){
        callback(res);
      }
    });
  }

  detached(){
    if(this.ordersObserver){
      this.ordersObserver.dispose();
    }
    //this.trySave();
  }

  // trySave(){
  //   var self = this;
  //   if(self.board != null) {
  //     self.home.saveQueue.addItem(self);
  //   }
  // }

  getNewLabOrder(patientId, providerId, date, userId){
    return{
      LabReqID:0,
      PatientID: patientId,
      ProviderID: providerId,
      DateCollect: date,
      ExamDateTime: date,
      UserID: userId,
      OrderStatus: 'Ordered'
    }
  }

  // load(callback){
  //   var self = this;

  //   self.orders = [];

  //   self.goData.getLabOrders(self.patientId, self.date, function(res){

  //     if(res == undefined || res == null)return;

  //     for(var i = 0; i < res.length; i++){
  //       var m = res[i];
  //       var aOrder = self.goData.getNewPx(m.LabReqID, m.Code, m.TestOrdered,self.helper.getISODateToFormat(m.ExamDateTime, "MM/DD/YYYY"), m);
  //       aOrder.side = m.BodySide;
  //       aOrder.type = m.Type.toUpperCase();

  //       // if(m.Type == 'X-RAY'){
  //       //   //add OUTSIDE option...
  //       //   aOrder.outside = false;
  //       // }

  //       aOrder.index=i;
  //       self.orders.push(aOrder);
  //     }

  //     // self.loading = false;
  //     if(callback){
  //       callback();
  //     }
  //   });


  //   self.getXrays(self.patientId, function(res){
  //     //self.openXrayHistory(res);
  //     self.xrays = res;

  //     self.loopOrders();

  //   });
  // }

  load(callback){
    var self = this;

    self.orders = [];

    self.getXrays(self.patientId, function(res){

      self.xrays = res;

      self.goData.getLabOrders(self.patientId, self.date, function(res){

        if(res == undefined || res == null)return;
  
        for(var i = 0; i < res.length; i++){
          var m = res[i];

          //dates...
          var oDate = self.helper.getISODateToFormat(m.ExamDateTime, "MM/DD/YYYY");

          var aOrder = self.goData.getNewPx(m.LabReqID, m.Code, m.TestOrdered,oDate, m);
          aOrder.side = m.BodySide;
          aOrder.type = m.Type.toUpperCase();
          aOrder.index=i;

          //can delete???
          aOrder.canDelete = (oDate == self.date && !self.locked) ? true : false;

          var foundXray = self.findXrayWithOrder(aOrder.data);
          if(foundXray){
            aOrder.xray = foundXray;
            aOrder.side = foundXray.Body_Side;
            if(foundXray.Type != null && foundXray.Type == "Outside"){
              aOrder.outside = true;
            }else{
              aOrder.outside = false;
            }
          }

          self.orders.push(aOrder);
        }
  
        // self.loading = false;
        if(callback){
          callback();
        }
      });

    });
  }

  loopOrders(){
    let self = this;
    for(let i = 0; i < self.orders.length; i++){
      let aOrder = self.orders[i];
      let foundXray = self.findXrayWithOrder(aOrder.data);
      if(foundXray){
        aOrder.xray = foundXray;
        aOrder.side = foundXray.Body_Side;
        if(foundXray.Type != null && foundXray.Type == "Outside"){
          aOrder.outside = true;
        }else{
          aOrder.outside = false;
        }
      }
    }
  }

  findXrayWithOrder(order){
    let self = this;
    //XRAY- CptKey, ExamDateTime
    //Order- Code, ExamDateTime
    var bodySide = order.BodySide ? order.BodySide : self.bodyside;

    return _.find(self.xrays, function(x){return x.CptKey == order.Code && 
      moment(x.ExamDateTime).format("MM/DD/YYYY") == moment(order.ExamDateTime).format("MM/DD/YYYY") &&
      x.Body_Side.toUpperCase() == bodySide.toUpperCase()});
  }

  toggleOutsideImage(order){
    order.outside = order.outside ? false : true;
    if(order.xray){
      order.xray.Type = order.outside ? 'Outside' : null;
      //update xray...
      this.updateXrayResults(order.xray);
    }
  }

  openXrayHistory(){

    let self = this;
    let path ='./xrayHistory';
    const windowHeight = window.innerHeight - 100;
    const windowWidth = window.innerWidth;

    let quarter = windowWidth / 4;
    let third = windowWidth / 3;

    // let width = windowWidth / 2;
    // let left = quarter;
    let width = third * 2;
    let left = third / 2;

    let height = windowHeight / 2;
    let qHeight = windowHeight / 4;
    let top = qHeight;

    let options={
      displayHeader: false,
      bodyPadding: 0
    }

    let model={
      xrays: self.xrays
    }

    self.popupHelper.openViewModelPop(path, model, 'Xray History', width, height, top, left, options, function(xray){
      //add xray to orders...
      var newX = self.goData.getNewPx(0, xray.data.CptKey, xray.data.Description, moment(self.date).format("MM/DD/YYYY"), xray.data);
      newX.canDelete = true;
      self.orders.push(newX);
      //self.save();
    });
  }


  getXrays(patientId, callback){
    let self = this;
    self.goData.getWithUrl(`xrayresult/wlitem?patientId=${patientId}`, function(res){
      callback(res);
    })
  }


 

  // pxChecked(px){
  //   var self = this;
  //
  //   if(px.selected){
  //     //remove
  //     for(var i = 0; i < self.orders.length; i++){
  //       var aPx= self.orders[i];
  //       if(aPx.id == px.id){
  //         self.orders.splice(i, 1);
  //       }
  //     }
  //   }
  //   else{
  //     var aPx = self.goData.getNewPx(px.id, px.code, px.description, self.date, px.data);
  //     aPx.selected = true;
  //     aPx.data.ExamDateTime = self.helper.getDateWithFormat(self.date, "MM/DD/YYYY");
  //     self.orders.splice(0,0,aPx);
  //   }
  // }

  save(callback){
    var self = this;
    let updateOrders=[];
    let saveOrders=[];
    let saveOrdersClone=[];

    if(self.block.dontSave){
      return;
    }


    for(var i = 0; i < self.orders.length; i++){

      //TestOrdered
      //Type
      //Code
      //VisitType
      //BodyPart,
      //BodySide
      let aOrder = self.orders[i];

      if(aOrder.id == 0){
        //SAVE NEW

        let orderToSave = self.getNewLabOrder(self.patientId, self.providerId, self.date, self.userId);
        orderToSave.TestOrdered = aOrder.description;
        orderToSave.Type = aOrder.data.hasOwnProperty('LNAMEID') ? 'LAB' : aOrder.data.Type;
        orderToSave.Code = aOrder.code;
        orderToSave.VisitType = self.board.visitInfo.visitType;
        orderToSave.BodyPart = aOrder.part ? aOrder.part : self.bodypart;
        orderToSave.BodySide = aOrder.side ? aOrder.side : self.bodyside;
        orderToSave.ExamDateTime = self.date;
        orderToSave.DateCollect = self.date;


        let saveOrderObject={
          'orderToSave': orderToSave,
          'localOrder': aOrder,
          'orderIndex': i
        }

        saveOrders.push(saveOrderObject);

        //add data to clone array for saving procedures later...
        saveOrdersClone.push(self.orders[i]);

      }else{
        //UPDATE
        updateOrders.push(aOrder.data);
      }

    }

    if(saveOrders.length > 0 || updateOrders.length > 0){
      //save orders...

      if(saveOrders.length > 0){
        //get just orders to save...
        let sOrders = _.map(saveOrders, 'orderToSave');

        self.goData.saveLabOrders(sOrders, function(res){

          for(let i = 0; i < sOrders.length; i++){

            //update local order id...
            saveOrders[i].localOrder.id = res[i].LabReqID;

            let saveOrder = sOrders[i];

            if(sOrders[i].Type == 'X-RAY' || sOrders[i].Type == 'XRAY'){
              // let aOrder = saveOrders[i];
              //create of_xray_result...
              var orderIndex =saveOrders[i].orderIndex;
              self.saveXraySubroutine(saveOrder, orderIndex, function(res){
                //update order data...
                self.orders[orderIndex].data = res;
                self.orders[orderIndex].xray = res;
              });
            }

            //save billable procedures...
            if(self.isProcedureBillable(saveOrdersClone[i].data)){
              self.goData.getWithUrl('patientprocedure', function(px){
                px.CptCode = saveOrder.Code;
                px.CodeDescr = saveOrder.TestOrdered;
                px.BodyPart = saveOrder.BodyPart;
                px.BodySide = saveOrder.BodySide;
                px.PatientID = saveOrder.PatientID;
                px.ProviderID = saveOrder.ProviderID;
                px.ExamDateTime = saveOrder.ExamDateTime;//moment(saveOrder.ExamDateTime).format('MM-DD-YYYY');
                px.UserID = saveOrder.UserID;
                px.Type = saveOrdersClone[i].data.Type;
                px.ProcedureID=saveOrdersClone[i].data.ProcedureID;
                px.MfgCode = saveOrdersClone[i].data.Cpt_Code;

                self.goData.postWithUrlAndData('patientprocedures', JSON.stringify(px), function(newPx){
                  self.eventAggregator.publish("refreshProcedures");
                });
              });
            }

          }

          // if(callback){
          //   callback(true);
          // }

        });
      }

      if(updateOrders.length > 0){
        self.goData.updateLabOrders(updateOrders, function(res){
          let s = res;
        });
      }

      if(callback){
        callback(true);
      }
  
    }else{
      if(callback){
        callback(true);
      }
    }
  }

  saveXraySubroutine(saveOrder, index, callback){
    let self = this;
    self.goData.getXrayResultNew(function(newXray){

      newXray.CptKey = saveOrder.Code;
      newXray.Description = saveOrder.TestOrdered + " " + saveOrder.BodySide;
      newXray.Body_Part = saveOrder.BodyPart;
      newXray.Body_Side = saveOrder.BodySide;
      newXray.PatientID = saveOrder.PatientID;
      newXray.ExamDateTime= saveOrder.ExamDateTime;
      newXray.ProviderID= saveOrder.ProviderID;
      newXray.UserID = saveOrder.UserID;
      newXray.IsComplete = true;

      self.goData.saveXrayResult(newXray, function(xres){

        self.xrays.push(xres);
        //add to document tray...
        self.addXrayToDocumentTray(xres, function(res){
          callback(xres, index);
        });
      });
    })
  }

  updateXrayResults(xray){
    let self = this;
    self.goData.updateXrayResult(xray, function(xres){

    });
  }


  addXrayToDocumentTray(OD_Xray_Results, callback){
    let self = this;

    //get VW_XrayWlItem
    self.goData.getWithUrl(`worklist?xrayid=${OD_Xray_Results.XrayID}`, function(wlitem){

      var aBlock = self.goData.getNewBlock();
      aBlock.description = OD_Xray_Results.Description;
      aBlock.setBlockType('document');
      aBlock.widthMult = 2;
      aBlock.heightMult = 2;


      let tt = self.home.taskHelper.getTaskTypeWithTypeAndDescription('order', 'xray');

      //create data object...
      let obj={
        TaskTypeID:tt.TaskTypeID,
        TaskTypeDescription:tt.Description,
        TaskType:tt.Type,
        Locked: 0,
        Description:OD_Xray_Results.Description,
        Type:"Order",
        ExamDateTime: OD_Xray_Results.ExamDateTime,
        CreateDate: OD_Xray_Results.ExamDateTime,
        ProviderID:OD_Xray_Results.ProviderID,
        ObjectID:OD_Xray_Results.XrayID,
        DocPath:wlitem.StudyID,
        Part:OD_Xray_Results.Body_Part,
        Details:OD_Xray_Results.XRayFinding,
        DetailsMore:OD_Xray_Results.CptKey,
        BoardId:""
      }


      aBlock.data = obj;
      aBlock.objectId = OD_Xray_Results.XrayID;
      self.home.currentBoard.documents.push(aBlock);

      callback(obj);

    });

  }

  openPreferencePicker(prefType){
    let self = this;
    //uniqBy
    let filtered=_.filter(self.prefs, function(p){return p.PrefType == prefType});
    filtered = _.uniqBy(filtered, "PanelDesc");
    let prefItems=[];
    for(let u = 0; u < filtered.length; u++){
      prefItems.push(self.goData.getGenericPicklistItem(filtered[u].PanelDesc, filtered[u]));
    }
    self.popupHelper.openGenericPicklistPop("Order Prefs", "Select a preference...", prefItems, false, function(selectedPref){

      var pref = selectedPref.item;
      //get all orders w/ this pref...
      var orders = _.filter(self.prefs, function(p){return p.PanelDesc == pref.data.PanelDesc});
      //add to grid...
      for(var i =0; i < orders.length; i++){

        var tOrder = orders[i];
        //clone px object...
        var newPx = _.clone(self.pxObject);
        newPx.CptKey = tOrder.Code;
        newPx.Description = tOrder.LabDescription;
        newPx.Billable = true;//tOrder.Billable;
        newPx.Type = tOrder.Type;
        newPx.Body_Part = tOrder.BodyPart;

        var aOrder = self.goData.getNewPx(0, newPx.CptKey, newPx.Description, null, newPx);
        aOrder.canDelete = true;
        self.tryAddWithExistanceCheck(aOrder);
      }

    });
  }


  getPrefs(providerId){
    var self = this;
    var url = "laborder/prefs?providerId="+ providerId;
    self.http.get(self.helper.getApiUrl(url), function (json) {
      for(var i = 0; i < json.length; i++){
        var m = json[i];
        //add to prefType list if it doesn't exist...
        if(!_.includes(self.prefTypes, m.PrefType)){
          self.prefTypes.push(m.PrefType);
        }
        self.prefs.push(m);
      }
    });
  }


  isProcedureBillable(px){
    if(px.Billable != null &&
      px.Billable.length > 0 &&
      px.Billable.toUpperCase() == 'YES'){
      return true;
    }else{
      return false;
    }
  }

  rowSwipe(event, row) {

    if(!row.canDelete){
      return;
    }

    if (event.direction === 'left') {
      //display delete option...
      if(!row.displayDelete){
        row.displayDelete = true;
        this.displayDeleteHeader = true;
      }
    }else if(event.direction === 'right') {
      //display delete option...
      if(row.displayDelete){
        row.displayDelete = false;
        this.displayDeleteHeader = false;
      }
    }
  }

  displayDeleteAlert(text, header, callback) {
    let self = this;
    self.popupHelper.openGenericMessagePop(text, header, ['YES','NO'], false, function(res){
      callback(res);
    });
  }

  deleteOrderClick(index){
    let self = this;
    self.displayDeleteAlert("Do you wish to delete this order?", 'Delete Order?', function(res){
      if(res.result== 'YES'){
        let id = self.orders[index].id;
        if(id==0){
          self.orders.splice(index, 1);
          self.updateRowIndexes();
        }else{
          self.deleteOrder(self.orders[index], function(res){
            if(res == true){
              self.orders.splice(index, 1);
              self.updateRowIndexes();
            }
          })
        }
      }else{
        //reset row delete...
        self.orders[index].displayDelete = false;
      }
    });
  }

  deleteOrder(order, callback){
    let self = this;
    let url = `laborders?id=${order.id}`;
    self.goData.deleteWithUrl(url, function(res){

      let strDate = moment(order.date).format('MM-DD-YYYY');

      //check for xray...
      if(order.hasOwnProperty("xray")){
        self.deleteXray(order.xray.XrayID);
      }

      self.deleteProcedureWithCodeDateAndPatientId(order.code, strDate, self.patientId, function(pxRes){

        callback(res);
      });
    });
  }

  deleteXray(xrayId){
    let self = this;
    //      aBlock.objectId = OD_Xray_Results.XrayID;
    //self.home.currentBoard.documents.push(aBlock);
    self.goData.deleteXrayResult(xrayId, function(res){
      //remove xray from documents tray...
      var xIndex = _.findIndex(self.home.currentBoard.documents, function(d){return d.objectId == xrayId});
      if(xIndex > -1){
        self.home.currentBoard.documents.splice(xIndex, 1);
      }
    });
  }

  deleteProcedureWithCodeDateAndPatientId(code, date, patientId, callback){
    let self = this;
    let getUrl = `patientprocedure/patients/${patientId}/code/${code}/date/${date}`;
    self.goData.getWithUrl(getUrl, function(getRes){
      if(getRes){
        let delUrl = `patientprocedures/${getRes.PatientCPTID}`;
        self.goData.deleteWithUrl(delUrl, function(delRes){

          self.refreshProcedures();
          callback(delRes);      
        });
      }else{
        callback(false);
      }
    });
  }

  refreshProcedures(){
    let self = this;
    self.eventAggregator.publish("refreshProcedures");
  }

  updateRowIndexes(){
    let self= this;
    for(let i = 0; i< self.orders.length; i++){
      let r = self.orders[i];
      r.index = i;
    }
    //self.signaler.signal('refresh-row');
  }

}
